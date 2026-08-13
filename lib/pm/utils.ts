import { DateTime } from 'luxon';

import { db, op, type orm, schema, type Txn } from '@app/drizzle';
import { BadRequestError, UnexpectedNotFoundError } from '@app/lib/error.ts';
import redis from '@app/lib/redis.ts';
import * as fetcher from '@app/lib/types/fetcher.ts';
import type * as res from '@app/lib/types/res.ts';
import { PrivacySettingKey, PrivacyValue, readPrivacySetting } from '@app/lib/user/privacy.ts';
import { ghostUser, isFriends, parseBlocklist } from '@app/lib/user/utils.ts';

import {
  PmConversationNotFoundError,
  PmReceiverNotFoundError,
  PmSendNotAllowedError,
  PmSendSelfError,
  PmTooManyReceiversError,
} from './errors.ts';
import { getPmEventChannel, type PmEvent, type PMFolder } from './type.ts';

export const MAX_RECEIVERS = 10;

export function toPrivateMessage(
  msg: orm.IPrivateMessage,
  sender: res.ISlimUser,
): res.IPrivateMessage {
  return {
    id: msg.msgId,
    sender,
    receiverID: msg.msgRid,
    title: msg.msgTitle,
    content: msg.msgMessage,
    createdAt: msg.msgDateline,
    read: msg.msgNew === 0,
    related: msg.msgRelated,
  };
}

function isVisibleTo(msg: orm.IPrivateMessage, uid: number): boolean {
  if (msg.msgRid === uid) {
    return msg.msgRdeleted === 0;
  }
  if (msg.msgSid === uid) {
    return msg.msgSdeleted === 0;
  }
  return false;
}

async function recalcNewpm(t: Txn, uid: number): Promise<void> {
  const [{ count = 0 } = {}] = await t
    .select({ count: op.count() })
    .from(schema.chiiPms)
    .where(
      op.and(
        op.eq(schema.chiiPms.msgRid, uid),
        op.eq(schema.chiiPms.msgRdeleted, 0),
        op.eq(schema.chiiPms.msgNew, 1),
      ),
    );
  await t
    .update(schema.chiiUsers)
    .set({ newpm: count > 0 ? 1 : 0 })
    .where(op.eq(schema.chiiUsers.id, uid));
}

/** Sender 是否可以向 receiver 发送私信（拉黑 + 隐私设置，静默返回 false，不抛错） */
export async function canSendPM(senderID: number, receiverID: number): Promise<boolean> {
  const [uf] = await db
    .select()
    .from(schema.chiiUserFields)
    .where(op.eq(schema.chiiUserFields.uid, receiverID))
    .limit(1);
  if (!uf) {
    throw new UnexpectedNotFoundError(`user field ${receiverID}`);
  }

  if (parseBlocklist(uf.blocklist).includes(senderID)) {
    return false;
  }

  const privacy = readPrivacySetting(uf.privacy, PrivacySettingKey.PrivateMessage);
  if (privacy === PrivacyValue.None) {
    return false;
  }
  if (privacy === PrivacyValue.Friends && !(await isFriends(receiverID, senderID))) {
    return false;
  }
  return true;
}

function assertReceiver(senderID: number, user: res.ISlimUser): void {
  if (user.id === senderID) {
    throw new PmSendSelfError();
  }
}

/** 解析并校验收件人（usernames 与 receiverIDs 必须且只能提供一个） */
export async function resolveReceivers(
  senderID: number,
  options: { usernames?: readonly string[]; receiverIDs?: readonly number[] },
): Promise<res.ISlimUser[]> {
  const usernames = options.usernames ?? [];
  const ids = options.receiverIDs ?? [];
  const hasUsernames = usernames.length > 0;
  const hasIDs = ids.length > 0;

  if (hasUsernames === hasIDs) {
    throw new BadRequestError('provide exactly one of receivers or receiverIDs');
  }

  const receivers: res.ISlimUser[] = [];
  if (hasUsernames) {
    const unique = [...new Set(usernames)];
    if (unique.length > MAX_RECEIVERS) {
      throw new PmTooManyReceiversError();
    }
    for (const username of unique) {
      const user = await fetcher.fetchSlimUserByUsername(username);
      if (!user) {
        throw new PmReceiverNotFoundError(username);
      }
      assertReceiver(senderID, user);
      receivers.push(user);
    }
  } else {
    const unique = [...new Set(ids)];
    if (unique.length > MAX_RECEIVERS) {
      throw new PmTooManyReceiversError();
    }
    const users = await fetcher.fetchSlimUsersByIDs(unique);
    for (const id of unique) {
      const user = users[id];
      if (!user) {
        throw new PmReceiverNotFoundError(id.toString());
      }
      assertReceiver(senderID, user);
      receivers.push(user);
    }
  }

  return receivers;
}

async function assertCanReply(
  senderID: number,
  receiverID: number,
  related: number,
): Promise<void> {
  const [root] = await db
    .select()
    .from(schema.chiiPms)
    .where(op.eq(schema.chiiPms.msgId, related))
    .limit(1);
  if (!root) {
    throw new PmConversationNotFoundError(related.toString());
  }

  const isSenderSide = root.msgSid === senderID && root.msgRid === receiverID;
  const isReceiverSide = root.msgSid === receiverID && root.msgRid === senderID;
  if (!isSenderSide && !isReceiverSide) {
    throw new PmConversationNotFoundError(related.toString());
  }
}

export interface SendPrivateMessageResult {
  messages: { receiverID: number; msgID: number }[];
}

export async function sendPrivateMessage(
  senderID: number,
  receivers: readonly res.ISlimUser[],
  title: string,
  content: string,
  related = 0,
): Promise<SendPrivateMessageResult> {
  const now = DateTime.now().toUnixInteger();
  const result: SendPrivateMessageResult = { messages: [] };

  // 原子校验：任一收件人被拒（拉黑 / 隐私 none / 隐私 friends），整体失败，不发送任何消息
  for (const receiver of receivers) {
    if (!(await canSendPM(senderID, receiver.id))) {
      throw new PmSendNotAllowedError();
    }
  }

  const receiverIDs = receivers.map((r) => r.id);

  await db.transaction(async (t) => {
    for (const receiverID of receiverIDs) {
      const isNew = related === 0;
      if (!isNew) {
        await assertCanReply(senderID, receiverID, related);
      }

      const [{ insertId }] = await t.insert(schema.chiiPms).values({
        msgSid: senderID,
        msgRid: receiverID,
        msgFolder: 'inbox',
        msgNew: 1,
        msgTitle: title,
        msgDateline: now,
        msgMessage: content,
        msgRelated: isNew ? 0 : related,
        msgRelatedMain: 0,
        msgSdeleted: 0,
        msgRdeleted: 0,
      });

      if (isNew) {
        await t
          .update(schema.chiiPms)
          .set({ msgRelated: insertId, msgRelatedMain: insertId })
          .where(op.eq(schema.chiiPms.msgId, insertId));
      }

      result.messages.push({ receiverID, msgID: insertId });
    }

    await t
      .update(schema.chiiUsers)
      .set({ newpm: 1 })
      .where(op.inArray(schema.chiiUsers.id, receiverIDs));
  });

  // 事务提交后再推送事件，保证消费者能读到已提交的数据
  const unreadCounts = await getUnreadCounts(receiverIDs);
  for (const { receiverID, msgID } of result.messages) {
    const event: PmEvent = {
      msgID,
      related: related === 0 ? msgID : related,
      count: unreadCounts.get(receiverID) ?? 0,
    };
    await redis.publish(getPmEventChannel(receiverID), JSON.stringify(event));
  }

  return result;
}

async function getUnreadCounts(receiverIDs: readonly number[]): Promise<Map<number, number>> {
  const rows = await db
    .select({ uid: schema.chiiPms.msgRid, count: op.count() })
    .from(schema.chiiPms)
    .where(
      op.and(
        op.inArray(schema.chiiPms.msgRid, receiverIDs),
        op.eq(schema.chiiPms.msgRdeleted, 0),
        op.eq(schema.chiiPms.msgNew, 1),
      ),
    )
    .groupBy(schema.chiiPms.msgRid);
  return new Map(rows.map((r) => [r.uid, r.count]));
}

export async function getMailboxStatus(uid: number): Promise<res.IPrivateMessageStatus> {
  const [[inbox], [outbox], [unread]] = await Promise.all([
    db
      .select({ count: op.count() })
      .from(schema.chiiPms)
      .where(op.and(op.eq(schema.chiiPms.msgRid, uid), op.eq(schema.chiiPms.msgRdeleted, 0))),
    db
      .select({ count: op.count() })
      .from(schema.chiiPms)
      .where(op.and(op.eq(schema.chiiPms.msgSid, uid), op.eq(schema.chiiPms.msgSdeleted, 0))),
    db
      .select({ count: op.count() })
      .from(schema.chiiPms)
      .where(
        op.and(
          op.eq(schema.chiiPms.msgRid, uid),
          op.eq(schema.chiiPms.msgRdeleted, 0),
          op.eq(schema.chiiPms.msgNew, 1),
        ),
      ),
  ]);

  return { inbox: inbox?.count ?? 0, outbox: outbox?.count ?? 0, unread: unread?.count ?? 0 };
}

export async function listConversations(
  uid: number,
  folder: PMFolder,
  limit: number,
  offset: number,
): Promise<res.IPaged<res.IPrivateMessageConversation>> {
  const isInbox = folder === 'inbox';
  const visibleConditions = isInbox
    ? [op.eq(schema.chiiPms.msgRid, uid), op.eq(schema.chiiPms.msgRdeleted, 0)]
    : [op.eq(schema.chiiPms.msgSid, uid), op.eq(schema.chiiPms.msgSdeleted, 0)];

  const [{ count = 0 } = {}] = await db
    .select({ count: op.countDistinct(schema.chiiPms.msgRelated) })
    .from(schema.chiiPms)
    .where(op.and(...visibleConditions));

  const groups = await db
    .select({
      rootID: schema.chiiPms.msgRelated,
      lastDateline: op.max(schema.chiiPms.msgDateline),
    })
    .from(schema.chiiPms)
    .where(op.and(...visibleConditions))
    .groupBy(schema.chiiPms.msgRelated)
    .orderBy(op.desc(op.max(schema.chiiPms.msgDateline)))
    .limit(limit)
    .offset(offset);

  if (groups.length === 0) {
    return { total: count, data: [] };
  }

  const rootIDs = groups.map((g) => g.rootID);

  const allMessages = await db
    .select()
    .from(schema.chiiPms)
    .where(op.and(op.inArray(schema.chiiPms.msgRelated, rootIDs), ...visibleConditions))
    .orderBy(op.asc(schema.chiiPms.msgDateline), op.asc(schema.chiiPms.msgId));

  const rootMessages = await db
    .select()
    .from(schema.chiiPms)
    .where(op.inArray(schema.chiiPms.msgId, rootIDs));
  const rootByID = new Map(rootMessages.map((m) => [m.msgId, m]));

  const byRoot = new Map<number, orm.IPrivateMessage[]>();
  for (const m of allMessages) {
    const arr = byRoot.get(m.msgRelated) ?? [];
    arr.push(m);
    byRoot.set(m.msgRelated, arr);
  }

  const otherUIDs = new Set<number>();
  const senderUIDs = new Set<number>();
  for (const rootID of rootIDs) {
    const root = rootByID.get(rootID);
    if (root) {
      const other = root.msgSid === uid ? root.msgRid : root.msgSid;
      if (other !== 0) {
        otherUIDs.add(other);
      }
    }
    for (const m of byRoot.get(rootID) ?? []) {
      if (m.msgSid !== 0) {
        senderUIDs.add(m.msgSid);
      }
    }
  }

  const users = await fetcher.fetchSlimUsersByIDs([...otherUIDs, ...senderUIDs], uid);

  const data: res.IPrivateMessageConversation[] = [];
  for (const rootID of rootIDs) {
    const root = rootByID.get(rootID);
    const msgs = byRoot.get(rootID) ?? [];
    if (msgs.length === 0) {
      continue;
    }
    const lastMsg = msgs.at(-1);
    if (!lastMsg) {
      continue;
    }
    const otherUID = root
      ? root.msgSid === uid
        ? root.msgRid
        : root.msgSid
      : lastMsg.msgSid === uid
        ? lastMsg.msgRid
        : lastMsg.msgSid;
    const lastSender =
      lastMsg.msgSid === 0 ? ghostUser(0) : (users[lastMsg.msgSid] ?? ghostUser(lastMsg.msgSid));
    const other = otherUID === 0 ? ghostUser(0) : (users[otherUID] ?? ghostUser(otherUID));

    data.push({
      id: rootID,
      title: root?.msgTitle ?? lastMsg.msgTitle,
      other,
      lastMessage: toPrivateMessage(lastMsg, lastSender),
      unreadCount: isInbox ? msgs.filter((m) => m.msgNew === 1).length : 0,
      totalCount: msgs.length,
    });
  }

  return { total: count, data };
}

export async function getConversation(
  uid: number,
  msgID: number,
): Promise<res.IPrivateMessageConversationDetail> {
  const [msg] = await db
    .select()
    .from(schema.chiiPms)
    .where(op.eq(schema.chiiPms.msgId, msgID))
    .limit(1);
  if (!msg) {
    throw new PmConversationNotFoundError(msgID.toString());
  }
  if (msg.msgSid !== uid && msg.msgRid !== uid) {
    throw new PmConversationNotFoundError(msgID.toString());
  }

  const rootID = msg.msgRelated;

  const messages = await db
    .select()
    .from(schema.chiiPms)
    .where(op.eq(schema.chiiPms.msgRelated, rootID))
    .orderBy(op.asc(schema.chiiPms.msgDateline), op.asc(schema.chiiPms.msgId));

  const visible = messages.filter((m) => isVisibleTo(m, uid));

  const [rootMsg] = await db
    .select()
    .from(schema.chiiPms)
    .where(op.eq(schema.chiiPms.msgId, rootID))
    .limit(1);

  const otherUID = rootMsg
    ? rootMsg.msgSid === uid
      ? rootMsg.msgRid
      : rootMsg.msgSid
    : msg.msgSid === uid
      ? msg.msgRid
      : msg.msgSid;

  const senderUIDs = [...new Set(visible.map((m) => m.msgSid).filter((id) => id !== 0))];
  const users = await fetcher.fetchSlimUsersByIDs(senderUIDs, uid);

  const other = otherUID === 0 ? ghostUser(0) : (users[otherUID] ?? ghostUser(otherUID));
  const data = visible.map((m) =>
    toPrivateMessage(m, m.msgSid === 0 ? ghostUser(0) : (users[m.msgSid] ?? ghostUser(m.msgSid))),
  );

  const conversation: res.IPrivateMessageConversation = {
    id: rootID,
    title: rootMsg?.msgTitle ?? msg.msgTitle,
    other,
    lastMessage: data.at(-1) ?? toPrivateMessage(msg, other),
    unreadCount: visible.filter((m) => m.msgRid === uid && m.msgNew === 1).length,
    totalCount: data.length,
  };

  return { conversation, messages: data };
}

export async function markConversationRead(uid: number, rootID: number): Promise<void> {
  await db.transaction(async (t) => {
    await t
      .update(schema.chiiPms)
      .set({ msgNew: 0 })
      .where(
        op.and(
          op.eq(schema.chiiPms.msgRelated, rootID),
          op.eq(schema.chiiPms.msgRid, uid),
          op.eq(schema.chiiPms.msgNew, 1),
        ),
      );
    await recalcNewpm(t, uid);
  });
}

/** 通过会话内任意一条消息 id 标记整个会话已读 */
export async function markConversationReadByMessageID(uid: number, msgID: number): Promise<void> {
  const [msg] = await db
    .select()
    .from(schema.chiiPms)
    .where(op.eq(schema.chiiPms.msgId, msgID))
    .limit(1);
  if (!msg) {
    throw new PmConversationNotFoundError(msgID.toString());
  }
  if (msg.msgSid !== uid && msg.msgRid !== uid) {
    throw new PmConversationNotFoundError(msgID.toString());
  }
  await markConversationRead(uid, msg.msgRelated);
}

export async function deleteMessage(uid: number, msgID: number): Promise<void> {
  const [msg] = await db
    .select()
    .from(schema.chiiPms)
    .where(op.eq(schema.chiiPms.msgId, msgID))
    .limit(1);
  if (!msg) {
    throw new PmConversationNotFoundError(msgID.toString());
  }
  if (msg.msgSid !== uid && msg.msgRid !== uid) {
    throw new PmConversationNotFoundError(msgID.toString());
  }

  await db.transaction(async (t) => {
    if (msg.msgSid === uid) {
      await t
        .update(schema.chiiPms)
        .set({ msgSdeleted: 1 })
        .where(op.eq(schema.chiiPms.msgId, msgID));
    } else {
      await t
        .update(schema.chiiPms)
        .set({ msgRdeleted: 1, msgNew: 0 })
        .where(op.eq(schema.chiiPms.msgId, msgID));
      await recalcNewpm(t, uid);
    }
  });
}

export async function deleteConversation(uid: number, msgID: number): Promise<void> {
  const [msg] = await db
    .select()
    .from(schema.chiiPms)
    .where(op.eq(schema.chiiPms.msgId, msgID))
    .limit(1);
  if (!msg) {
    throw new PmConversationNotFoundError(msgID.toString());
  }
  if (msg.msgSid !== uid && msg.msgRid !== uid) {
    throw new PmConversationNotFoundError(msgID.toString());
  }

  const rootID = msg.msgRelated;
  await db.transaction(async (t) => {
    await t
      .update(schema.chiiPms)
      .set({ msgRdeleted: 1, msgNew: 0 })
      .where(op.and(op.eq(schema.chiiPms.msgRelated, rootID), op.eq(schema.chiiPms.msgRid, uid)));
    await t
      .update(schema.chiiPms)
      .set({ msgSdeleted: 1 })
      .where(op.and(op.eq(schema.chiiPms.msgRelated, rootID), op.eq(schema.chiiPms.msgSid, uid)));
    await recalcNewpm(t, uid);
  });
}

export async function listRecentContacts(uid: number): Promise<res.IPrivateMessageContact[]> {
  const rows = await db
    .select({
      receiverID: schema.chiiPms.msgRid,
      lastDateline: op.max(schema.chiiPms.msgDateline),
    })
    .from(schema.chiiPms)
    .where(op.eq(schema.chiiPms.msgSid, uid))
    .groupBy(schema.chiiPms.msgRid)
    .orderBy(op.desc(op.max(schema.chiiPms.msgDateline)))
    .limit(15);

  const contacts = rows.filter((r) => r.receiverID !== uid && r.receiverID !== 0);
  const users = await fetcher.fetchSlimUsersByIDs(
    contacts.map((c) => c.receiverID),
    uid,
  );

  return contacts.map((c) => ({
    user: users[c.receiverID] ?? ghostUser(c.receiverID),
    lastMessageAt: c.lastDateline ?? 0,
  }));
}
