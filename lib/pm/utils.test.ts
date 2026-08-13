import { beforeEach, describe, expect, test } from 'vitest';

import { db, op, type orm, schema } from '@app/drizzle';
import redis from '@app/lib/redis.ts';
import type * as res from '@app/lib/types/res.ts';

import { canSendPM, toPrivateMessage } from './utils.ts';

const senderID = 1;
const receiverID = 287622;

const sender: res.ISlimUser = {
  id: senderID,
  username: '1',
  nickname: 'test',
  avatar: { small: '', medium: '', large: '' },
  group: 0,
  sign: '',
  joinedAt: 0,
  isFriend: false,
};

describe('toPrivateMessage', () => {
  test('should convert an unread message', () => {
    const msg: orm.IPrivateMessage = {
      msgId: 100,
      msgSid: senderID,
      msgRid: receiverID,
      msgFolder: 'inbox',
      msgNew: 1,
      msgTitle: 'hello',
      msgDateline: 123,
      msgMessage: 'world',
      msgRelatedMain: 100,
      msgRelated: 100,
      msgSdeleted: 0,
      msgRdeleted: 0,
    };

    expect(toPrivateMessage(msg, sender)).toMatchObject({
      id: 100,
      sender: { id: senderID },
      receiverID,
      title: 'hello',
      content: 'world',
      createdAt: 123,
      read: false,
      related: 100,
    });
  });
});

describe('canSendPM', () => {
  beforeEach(async () => {
    await redis.flushdb();
    await db
      .update(schema.chiiUserFields)
      .set({ privacy: '', blocklist: '' })
      .where(op.eq(schema.chiiUserFields.uid, receiverID));
  });

  test('should allow by default', async () => {
    await expect(canSendPM(senderID, receiverID)).resolves.toBe(true);
  });

  test('should disallow when privacy is none', async () => {
    await db
      .update(schema.chiiUserFields)
      .set({ privacy: '{"1":2}' })
      .where(op.eq(schema.chiiUserFields.uid, receiverID));

    await expect(canSendPM(senderID, receiverID)).resolves.toBe(false);
  });

  test('should disallow when sender is blocked', async () => {
    await db
      .update(schema.chiiUserFields)
      .set({ blocklist: String(senderID) })
      .where(op.eq(schema.chiiUserFields.uid, receiverID));

    await expect(canSendPM(senderID, receiverID)).resolves.toBe(false);
  });
});
