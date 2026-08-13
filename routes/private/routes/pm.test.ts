import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { db, op, schema } from '@app/drizzle';
import { emptyAuth } from '@app/lib/auth/index.ts';
import redis from '@app/lib/redis.ts';
import { createTestServer } from '@app/tests/utils.ts';

import { setup } from './pm.ts';

const senderID = 1;
const receiverID = 287622;
const otherReceiverID = 382951;

function appWith(userID: number) {
  return createTestServer({
    auth: {
      ...emptyAuth(),
      login: true,
      userID,
    },
  });
}

async function clearPmData() {
  await db
    .delete(schema.chiiPms)
    .where(
      op.or(
        op.or(op.eq(schema.chiiPms.msgSid, senderID), op.eq(schema.chiiPms.msgRid, senderID)),
        op.or(op.eq(schema.chiiPms.msgSid, receiverID), op.eq(schema.chiiPms.msgRid, receiverID)),
      ),
    );
  await db
    .update(schema.chiiUserFields)
    .set({ privacy: '', blocklist: '' })
    .where(op.inArray(schema.chiiUserFields.uid, [senderID, receiverID, otherReceiverID]));
  await db
    .update(schema.chiiUsers)
    .set({ newpm: 0 })
    .where(op.inArray(schema.chiiUsers.id, [senderID, receiverID]));
}

describe('private message', () => {
  beforeEach(async () => {
    await redis.flushdb();
    await clearPmData();
  });

  afterEach(async () => {
    await redis.flushdb();
    await clearPmData();
  });

  test('should send a new private message', async () => {
    const app = appWith(senderID);
    await app.register(setup);

    const res = await app.inject({
      method: 'post',
      url: '/pm',
      payload: {
        receivers: ['287622'],
        title: 'hello',
        content: 'world',
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      messages: [{ receiverID, msgID: expect.any(Number) }],
    });

    const msgID = res.json().messages[0].msgID;
    const [msg] = await db.select().from(schema.chiiPms).where(op.eq(schema.chiiPms.msgId, msgID));
    expect(msg).toBeDefined();
    expect(msg?.msgSid).toBe(senderID);
    expect(msg?.msgRid).toBe(receiverID);
    expect(msg?.msgNew).toBe(1);
    expect(msg?.msgRelated).toBe(msgID);
    expect(msg?.msgRelatedMain).toBe(msgID);

    const [receiver] = await db
      .select()
      .from(schema.chiiUsers)
      .where(op.eq(schema.chiiUsers.id, receiverID));
    expect(receiver?.newpm).toBe(1);
  });

  test('should reject sending to self', async () => {
    const app = appWith(senderID);
    await app.register(setup);

    const res = await app.inject({
      method: 'post',
      url: '/pm',
      payload: {
        receivers: ['1'],
        title: 'hello',
        content: 'world',
      },
    });
    expect(res.statusCode).toBe(400);
  });

  test('should reject sending to nonexistent user', async () => {
    const app = appWith(senderID);
    await app.register(setup);

    const res = await app.inject({
      method: 'post',
      url: '/pm',
      payload: {
        receivers: ['no-such-user'],
        title: 'hello',
        content: 'world',
      },
    });
    expect(res.statusCode).toBe(404);
  });

  test('should reject with 403 when receiver privacy is none', async () => {
    await db
      .update(schema.chiiUserFields)
      .set({ privacy: '{"1":2}' })
      .where(op.eq(schema.chiiUserFields.uid, receiverID));

    const app = appWith(senderID);
    await app.register(setup);

    const res = await app.inject({
      method: 'post',
      url: '/pm',
      payload: {
        receivers: ['287622'],
        title: 'hello',
        content: 'world',
      },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().code).toBe('PM_SEND_NOT_ALLOWED');

    const [msg] = await db
      .select()
      .from(schema.chiiPms)
      .where(op.eq(schema.chiiPms.msgSid, senderID));
    expect(msg).toBeUndefined();
  });

  test('should reject with 403 when sender is in receiver blocklist', async () => {
    await db
      .update(schema.chiiUserFields)
      .set({ blocklist: String(senderID) })
      .where(op.eq(schema.chiiUserFields.uid, receiverID));

    const app = appWith(senderID);
    await app.register(setup);

    const res = await app.inject({
      method: 'post',
      url: '/pm',
      payload: {
        receivers: ['287622'],
        title: 'hello',
        content: 'world',
      },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().code).toBe('PM_SEND_NOT_ALLOWED');

    const [msg] = await db
      .select()
      .from(schema.chiiPms)
      .where(op.eq(schema.chiiPms.msgSid, senderID));
    expect(msg).toBeUndefined();
  });

  test('should reject whole send when any receiver is not allowed', async () => {
    await db
      .update(schema.chiiUserFields)
      .set({ blocklist: String(senderID) })
      .where(op.eq(schema.chiiUserFields.uid, receiverID));

    const app = appWith(senderID);
    await app.register(setup);

    const res = await app.inject({
      method: 'post',
      url: '/pm',
      payload: {
        receiverIDs: [receiverID, otherReceiverID],
        title: 'hello',
        content: 'world',
      },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().code).toBe('PM_SEND_NOT_ALLOWED');

    const [msg] = await db
      .select()
      .from(schema.chiiPms)
      .where(op.eq(schema.chiiPms.msgSid, senderID));
    expect(msg).toBeUndefined();
  });

  test('should reply to an existing conversation', async () => {
    const app = appWith(senderID);
    await app.register(setup);

    const res = await app.inject({
      method: 'post',
      url: '/pm',
      payload: {
        receivers: ['287622'],
        title: 'hello',
        content: 'first',
      },
    });
    const rootID = res.json().messages[0].msgID;

    const res2 = await app.inject({
      method: 'post',
      url: '/pm',
      payload: {
        receivers: ['287622'],
        title: 'Re: hello',
        content: 'second',
        related: rootID,
      },
    });
    expect(res2.statusCode).toBe(200);

    const replyID = res2.json().messages[0].msgID;
    const [reply] = await db
      .select()
      .from(schema.chiiPms)
      .where(op.eq(schema.chiiPms.msgId, replyID));
    expect(reply?.msgRelated).toBe(rootID);
    expect(reply?.msgRelatedMain).toBe(0);
  });

  test('should list inbox and outbox conversations', async () => {
    const app = appWith(senderID);
    await app.register(setup);

    await app.inject({
      method: 'post',
      url: '/pm',
      payload: { receivers: ['287622'], title: 'hello', content: 'world' },
    });

    const inbox = await app.inject('/pm/inbox');
    expect(inbox.statusCode).toBe(200);
    expect(inbox.json().total).toBe(0);

    const outbox = await app.inject('/pm/outbox');
    expect(outbox.statusCode).toBe(200);
    expect(outbox.json().total).toBe(1);
    expect(outbox.json().data).toHaveLength(1);
    expect(outbox.json().data[0]).toMatchObject({
      title: 'hello',
      totalCount: 1,
      unreadCount: 0,
    });
    expect(outbox.json().data[0].other).toMatchObject({ id: receiverID });
    expect(outbox.json().data[0].lastMessage).toMatchObject({
      title: 'hello',
      content: 'world',
      receiverID,
    });
  });

  test('should get conversation without marking read, then mark read explicitly', async () => {
    const app = appWith(senderID);
    await app.register(setup);

    const res = await app.inject({
      method: 'post',
      url: '/pm',
      payload: { receivers: ['287622'], title: 'hello', content: 'world' },
    });
    const msgID = res.json().messages[0].msgID;

    const receiverApp = appWith(receiverID);
    await receiverApp.register(setup);

    const detail = await receiverApp.inject(`/pm/conversations/${msgID}`);
    expect(detail.statusCode).toBe(200);
    expect(detail.json().messages).toHaveLength(1);
    expect(detail.json().messages[0]).toMatchObject({ read: false });
    expect(detail.json().conversation).toMatchObject({
      id: msgID,
      title: 'hello',
      unreadCount: 1,
      totalCount: 1,
    });
    expect(detail.json().conversation.other).toMatchObject({ id: senderID });

    let [msg] = await db.select().from(schema.chiiPms).where(op.eq(schema.chiiPms.msgId, msgID));
    expect(msg?.msgNew).toBe(1);

    const read = await receiverApp.inject({
      method: 'put',
      url: `/pm/conversations/${msgID}/read`,
    });
    expect(read.statusCode).toBe(200);

    [msg] = await db.select().from(schema.chiiPms).where(op.eq(schema.chiiPms.msgId, msgID));
    expect(msg?.msgNew).toBe(0);

    const [receiver] = await db
      .select()
      .from(schema.chiiUsers)
      .where(op.eq(schema.chiiUsers.id, receiverID));
    expect(receiver?.newpm).toBe(0);
  });

  test('should delete a conversation', async () => {
    const app = appWith(senderID);
    await app.register(setup);

    const res = await app.inject({
      method: 'post',
      url: '/pm',
      payload: { receivers: ['287622'], title: 'hello', content: 'world' },
    });
    const msgID = res.json().messages[0].msgID;

    const receiverApp = appWith(receiverID);
    await receiverApp.register(setup);
    const del = await receiverApp.inject({
      method: 'delete',
      url: `/pm/conversations/${msgID}`,
    });
    expect(del.statusCode).toBe(200);

    const [msg] = await db.select().from(schema.chiiPms).where(op.eq(schema.chiiPms.msgId, msgID));
    expect(msg?.msgRdeleted).toBe(1);

    const inbox = await receiverApp.inject('/pm/inbox');
    expect(inbox.json().total).toBe(0);
  });

  test('should get mailbox status and contacts', async () => {
    const app = appWith(senderID);
    await app.register(setup);

    const status = await app.inject('/pm');
    expect(status.statusCode).toBe(200);
    expect(status.json()).toMatchObject({ inbox: 0, outbox: 0, unread: 0 });

    await app.inject({
      method: 'post',
      url: '/pm',
      payload: { receivers: ['287622'], title: 'hello', content: 'world' },
    });

    const status2 = await app.inject('/pm');
    expect(status2.json()).toMatchObject({ inbox: 0, outbox: 1, unread: 0 });

    const contacts = await app.inject('/pm/contacts');
    expect(contacts.statusCode).toBe(200);
    expect(contacts.json()).toHaveLength(1);
    expect(contacts.json()[0].user).toMatchObject({ id: receiverID });
  });
});
