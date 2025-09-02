import * as lodash from 'lodash-es';

import { db, incr, op, schema, type Txn } from '@app/drizzle';
import { siteUrl } from '@app/lib/config.ts';
import { isFriends, parseBlocklist } from '@app/lib/user/utils.ts';

import { NotFoundError, UnreachableError } from './error.ts';
import { decode } from './utils/index.ts';

/**
 * `nt_type`
 *
 * Todo 参照下面的 `_settings`
 */
export const NotifyType = Object.freeze({
  Unknown: 0,
  GroupTopicReply: 1,
  GroupPostReply: 2,
  IndexTopicReply: 3,
  IndexPostReply: 4,
  CharacterTopicReply: 5,
  CharacterPostReply: 6,
  SubjectTopicReply: 7,
  SubjectPostReply: 8,
  _9: 9,
  _10: 10,
  _11: 11,
  _12: 12,
  _13: 13,
  RequestFriend: 14,
  AcceptFriend: 15,
  _16: 16,
  _17: 17,
  _18: 18,
  _19: 19,
  _20: 20,
  _21: 21,
  _22: 22,
  _23: 23,
  _24: 24,
  _25: 25,
  _26: 26,
  _27: 27,
  _28: 28,
  _29: 29,
  _30: 30,
  _31: 31,
  _32: 32,
  _33: 33,
  _34: 34,
});

export type NotifyType = (typeof NotifyType)[keyof typeof NotifyType];

export const PrivacyFilter = Object.freeze({
  All: 0,
  Friends: 1,
  None: 2,
});
export type PrivacyFilter = (typeof PrivacyFilter)[keyof typeof PrivacyFilter];

interface Creation {
  destUserID: number;
  sourceUserID: number;
  createdAt: number;
  type: NotifyType;
  /** 对应回帖所对应的 post id */
  relatedID: number;
  /** Notify Field 里的 rid，对应为 帖子 id, 章节 id ... */
  mainID: number;
  title: string;
}

export interface INotify {
  id: number;
  type: number;
  createdAt: number;
  fromUid: number;
  relatedID: number;
  unread: boolean;
  mainID: number;
  title: string;
}

interface Filter {
  unread?: boolean;
  limit: number;
}

type UserPrivacySettingsField = number;

const UserPrivacyReceivePrivateMessage: UserPrivacySettingsField = 1;
const UserPrivacyReceiveTimelineReply: UserPrivacySettingsField = 30;
const UserPrivacyReceiveMentionNotification: UserPrivacySettingsField = 20;
const UserPrivacyReceiveCommentNotification: UserPrivacySettingsField = 21;

interface PrivacySetting {
  TimelineReply: PrivacyFilter;
  CommentNotification: PrivacyFilter;
  MentionNotification: PrivacyFilter;
  PrivateMessage: PrivacyFilter;

  blockedUsers: number[];
}

const defaultPrivacySetting: PrivacySetting = {
  TimelineReply: PrivacyFilter.All,
  CommentNotification: PrivacyFilter.All,
  MentionNotification: PrivacyFilter.All,
  PrivateMessage: PrivacyFilter.All,
  blockedUsers: [],
};

export const Notify = {
  /**
   * 创建 notify
   *
   * @param t - 事务
   * @param creation - 创建 notify 所需参数
   */
  async create(
    t: Txn,
    { destUserID, sourceUserID, createdAt, type, relatedID, mainID, title }: Creation,
  ): Promise<void> {
    if (destUserID === sourceUserID) {
      return;
    }
    const setting = await getUserNotifySetting(destUserID);
    if (setting.blockedUsers.includes(sourceUserID)) {
      return;
    }
    if (setting.CommentNotification === PrivacyFilter.None) {
      return;
    }
    if (setting.CommentNotification === PrivacyFilter.Friends) {
      const isFriend = await isFriends(destUserID, sourceUserID);
      if (!isFriend) {
        return;
      }
    }
    const hash = hashType(type);
    let fieldID = 0;
    const [field] = await t
      .select()
      .from(schema.chiiNotifyField)
      .where(
        op.and(op.eq(schema.chiiNotifyField.hash, hash), op.eq(schema.chiiNotifyField.rid, mainID)),
      )
      .limit(1);
    if (field) {
      fieldID = field.id;
    } else {
      const [result] = await t.insert(schema.chiiNotifyField).values({
        title,
        hash,
        rid: mainID,
      });
      fieldID = result.insertId;
    }
    await t.insert(schema.chiiNotify).values({
      uid: destUserID,
      fromUID: sourceUserID,
      unread: true,
      createdAt,
      type,
      fieldID,
      related: relatedID,
    });
    await t
      .update(schema.chiiUsers)
      .set({ newNotify: incr(schema.chiiUsers.newNotify) })
      .where(op.eq(schema.chiiUsers.id, destUserID));
  },

  async markAllAsRead(userID: number, ids?: number[]): Promise<void> {
    await db.transaction(async (t) => {
      await t
        .update(schema.chiiNotify)
        .set({ unread: false })
        .where(
          op.and(
            op.eq(schema.chiiNotify.uid, userID),
            op.eq(schema.chiiNotify.unread, true),
            ids ? op.inArray(schema.chiiNotify.id, ids) : undefined,
          ),
        );
      await this.consolidateUnreadCount(t, userID);
    });
  },

  async count(userID: number): Promise<number> {
    const [user] = await db
      .select()
      .from(schema.chiiUsers)
      .where(op.eq(schema.chiiUsers.id, userID));
    return user?.newNotify ?? 0;
  },

  async consolidateUnreadCount(t: Txn, userID: number): Promise<number> {
    const [{ count = 0 } = {}] = await t
      .select({ count: op.count(schema.chiiNotify.id) })
      .from(schema.chiiNotify)
      .where(op.and(op.eq(schema.chiiNotify.uid, userID), op.eq(schema.chiiNotify.unread, true)));
    await t
      .update(schema.chiiUsers)
      .set({ newNotify: count })
      .where(op.eq(schema.chiiUsers.id, userID));
    return count;
  },

  async list(userID: number, { unread, limit = 30 }: Filter): Promise<INotify[]> {
    const conditions = [op.eq(schema.chiiNotify.uid, userID)];
    if (unread !== undefined) {
      conditions.push(op.eq(schema.chiiNotify.unread, unread));
    }
    const notifications = await db
      .select()
      .from(schema.chiiNotify)
      .where(op.and(...conditions))
      .orderBy(op.desc(schema.chiiNotify.createdAt))
      .limit(limit);
    if (notifications.length === 0) {
      return [];
    }
    const fieldIDs = lodash.uniq(notifications.map((x) => x.fieldID));
    const fields = await db
      .select()
      .from(schema.chiiNotifyField)
      .where(op.inArray(schema.chiiNotifyField.id, fieldIDs));
    const fieldMap = Object.fromEntries(fields.map((x) => [x.id, x]));
    return notifications.map((x) => {
      const field = fieldMap[x.fieldID];
      return {
        id: x.id,
        type: x.type,
        createdAt: x.createdAt,
        fromUid: x.fromUID,
        title: field?.title ?? '',
        mainID: field?.rid ?? 0,
        relatedID: x.related,
        unread: x.unread,
      } satisfies INotify;
    });
  },
};

async function getUserNotifySetting(userID: number): Promise<PrivacySetting> {
  const [uf] = await db
    .select()
    .from(schema.chiiUserFields)
    .where(op.eq(schema.chiiUserFields.uid, userID));
  if (!uf) {
    throw new NotFoundError('user not found');
  }

  const blockedUsers = parseBlocklist(uf.blocklist);
  if (!uf.privacy) {
    return {
      ...defaultPrivacySetting,
      blockedUsers,
    };
  }

  const field = decode(uf.privacy) as Record<number, number>;
  return {
    PrivateMessage: field[UserPrivacyReceivePrivateMessage] as PrivacyFilter,
    TimelineReply: field[UserPrivacyReceiveTimelineReply] as PrivacyFilter,
    MentionNotification: field[UserPrivacyReceiveMentionNotification] as PrivacyFilter,
    CommentNotification: field[UserPrivacyReceiveCommentNotification] as PrivacyFilter,
    blockedUsers,
  };
}

/** 计算 notifyField 的 hash 字段，参照 settings */
function hashType(t: NotifyType): number {
  const setting = _settings[t];
  if (!setting) {
    throw new UnreachableError(`missing setting for notify type ${t}`);
  }

  return setting.hash;
}

interface setting {
  url: string;

  prefix: string;
  suffix: string;

  append?: string;
  url_mobile?: string;
  anchor: string;
  id: number;
  hash: number;
  merge?: number;
}

const _settings: Record<number, setting> = {
  1: {
    url: `${siteUrl}/group/topic`,
    url_mobile: 'MOBILE_URL/topic/group/',
    anchor: '#post_',
    prefix: '在你的小组话题',
    suffix: '中发表了新回复',
    id: 1,
    hash: 1,
    merge: 1,
  },
  2: {
    url: `${siteUrl}/group/topic`,
    url_mobile: 'MOBILE_URL/topic/group/',
    anchor: '#post_',
    prefix: '在小组话题',
    suffix: '中回复了你',
    id: 2,
    hash: 1,
    merge: 1,
  },
  3: {
    url: `${siteUrl}/subject/topic`,
    url_mobile: '/topic/subject',
    anchor: '#post_',
    prefix: '在你的条目讨论',
    suffix: '中发表了新回复',
    id: 3,
    hash: 3,
    merge: 1,
  },
  4: {
    url: `${siteUrl}/subject/topic/`,
    url_mobile: 'MOBILE_URL/topic/subject/',
    anchor: '#post_',
    prefix: '在条目讨论',
    suffix: '中回复了你',
    id: 4,
    hash: 3,
    merge: 1,
  },
  5: {
    url: `${siteUrl}/character/`,
    url_mobile: 'MOBILE_URL/topic/crt/',
    anchor: '#post_',
    prefix: '在角色讨论',
    suffix: '中发表了新回复',
    id: 5,
    hash: 5,
    merge: 1,
  },
  6: {
    url: `${siteUrl}/character/`,
    url_mobile: 'MOBILE_URL/topic/crt/',
    anchor: '#post_',
    prefix: '在角色',
    suffix: '中回复了你',
    id: 6,
    hash: 5,
    merge: 1,
  },
  7: {
    url: '/blog/',
    anchor: '#post_',
    prefix: '在你的日志',
    suffix: '中发表了新回复',
    id: 7,
    hash: 7,
    merge: 1,
  },
  '8': {
    url: `${siteUrl}/blog/`,
    anchor: '#post_',
    prefix: '在日志',
    suffix: '中回复了你',
    id: 8,
    hash: 7,
    merge: 1,
  },
  '9': {
    url: `${siteUrl}/subject/ep/`,
    url_mobile: 'MOBILE_URL/topic/ep/',
    anchor: '#post_',
    prefix: '在章节讨论',
    suffix: '中发表了新回复',
    id: 9,
    hash: 9,
    merge: 1,
  },
  '10': {
    url: `${siteUrl}/subject/ep/`,
    url_mobile: 'MOBILE_URL/topic/ep/',
    anchor: '#post_',
    prefix: '在章节讨论',
    suffix: '中回复了你',
    id: 10,
    hash: 9,
    merge: 1,
  },
  '11': {
    url: `${siteUrl}/index/`,
    anchor: '#post_',
    append: '/comments',
    prefix: '在目录',
    suffix: '中给你留言了',
    id: 11,
    hash: 11,
    merge: 1,
  },
  '12': {
    url: `${siteUrl}/index/`,
    anchor: '#post_',
    append: '/comments',
    prefix: '在目录',
    suffix: '中回复了你',
    id: 12,
    hash: 11,
    merge: 1,
  },
  '13': {
    url: `${siteUrl}/person/`,
    url_mobile: 'MOBILE_URL/topic/prsn/',
    anchor: '#post_',
    prefix: '在人物',
    suffix: '中回复了你',
    id: 13,
    hash: 13,
    merge: 1,
  },
  '14': {
    url: `${siteUrl}/user/`,
    anchor: '#',
    prefix: '请求与你成为好友',
    suffix: '',
    id: 14,
    hash: 14,
  },
  '15': {
    url: `${siteUrl}/user/`,
    anchor: '#',
    prefix: '通过了你的好友请求',
    suffix: '',
    id: 15,
    hash: 14,
  },
  '17': {
    url: 'DOUJIN_URL/club/topic/',
    anchor: '#post_',
    prefix: '在你的社团讨论',
    suffix: '中发表了新回复',
    id: 17,
    hash: 17,
    merge: 1,
  },
  '18': {
    url: 'DOUJIN_URL/club/topic/',
    anchor: '#post_',
    prefix: '在社团讨论',
    suffix: '中回复了你',
    id: 18,
    hash: 17,
    merge: 1,
  },
  '19': {
    url: 'DOUJIN_URL/subject/',
    anchor: '#post_',
    prefix: '在同人作品',
    suffix: '中回复了你',
    id: 19,
    hash: 19,
    merge: 1,
  },
  '20': {
    url: 'DOUJIN_URL/event/topic/',
    anchor: '#post_',
    prefix: '在你的展会讨论',
    suffix: '中发表了新回复',
    id: 20,
    hash: 20,
    merge: 1,
  },
  '21': {
    url: 'DOUJIN_URL/event/topic/',
    anchor: '#post_',
    prefix: '在展会讨论',
    suffix: '中回复了你',
    id: 21,
    hash: 20,
    merge: 1,
  },
  '22': {
    url: `${siteUrl}/user/chobits_user/timeline/status/`,
    anchor: '#post_',
    prefix: '回复了你的 <a href="%2$s%3$s" class="nt_link link_%4$s" target="_blank">吐槽</a>',
    suffix: '',
    id: 22,
    hash: 22,
    merge: 1,
  },
  '23': {
    url: `${siteUrl}/group/topic/`,
    url_mobile: 'MOBILE_URL/topic/group/',
    anchor: '#post_',
    prefix: '在小组话题',
    suffix: '中提到了你',
    id: 23,
    hash: 1,
    merge: 1,
  },
  '24': {
    url: `${siteUrl}/subject/topic/`,
    url_mobile: 'MOBILE_URL/topic/subject/',
    anchor: '#post_',
    prefix: '在条目讨论',
    suffix: '中提到了你',
    id: 24,
    hash: 3,
    merge: 1,
  },
  '25': {
    url: `${siteUrl}/character/`,
    url_mobile: 'MOBILE_URL/topic/crt/',
    anchor: '#post_',
    prefix: '在角色',
    suffix: '中提到了你',
    id: 25,
    hash: 5,
    merge: 1,
  },
  '26': {
    url: `${siteUrl}/person/`,
    url_mobile: 'MOBILE_URL/topic/prsn/',
    anchor: '#post_',
    prefix: '在人物讨论',
    suffix: '中提到了你',
    id: 26,
    hash: 5,
    merge: 1,
  },
  '27': {
    url: `${siteUrl}/index/`,
    anchor: '#post_',
    append: '/comments',
    prefix: '在目录',
    suffix: '中提到了你',
    id: 28,
    hash: 11,
    merge: 1,
  },
  '28': {
    url: `${siteUrl}/user/chobits_user/timeline/status/`,
    anchor: '#post_',
    prefix: '在',
    suffix: '中提到了你',
    id: 28,
    hash: 22,
    merge: 1,
  },
  '29': {
    url: `${siteUrl}/blog/`,
    anchor: '#post_',
    prefix: '在日志',
    suffix: '中提到了你',
    id: 29,
    hash: 7,
    merge: 1,
  },
  '30': {
    url: `${siteUrl}/subject/ep/`,
    url_mobile: 'MOBILE_URL/topic/ep/',
    anchor: '#post_',
    prefix: '在章节讨论',
    suffix: '中提到了你',
    id: 30,
    hash: 9,
    merge: 1,
  },
  '31': {
    url: 'DOUJIN_URL/club/',
    anchor: '/shoutbox#post_',
    prefix: '在社团',
    suffix: '的留言板中提到了你',
    id: 31,
    hash: 31,
    merge: 1,
  },
  '32': {
    url: 'DOUJIN_URL/club/topic/',
    anchor: '#post_',
    prefix: '在社团讨论',
    suffix: '中提到了你',
    id: 32,
    hash: 17,
    merge: 1,
  },
  '33': {
    url: 'DOUJIN_URL/subject/',
    anchor: '#post_',
    prefix: '在同人作品',
    suffix: '中提到了你',
    id: 33,
    hash: 19,
    merge: 1,
  },
  '34': {
    url: 'DOUJIN_URL/event/topic/',
    anchor: '#post_',
    prefix: '在展会讨论',
    suffix: '中提到了你',
    id: 34,
    hash: 20,
    merge: 1,
  },

  35: {
    url: 'DOUJIN_URL/event/topic/',
    anchor: '#post_',
    prefix: '在 patch 讨论',
    suffix: '中回复了你',
    id: 35,
    hash: 21,
    merge: 1,
  },

  36: {
    url: 'DOUJIN_URL/event/topic/',
    anchor: '#post_',
    prefix: '在 patch 讨论',
    suffix: '中回复了你',
    id: 36,
    hash: 21,
    merge: 1,
  },
};
