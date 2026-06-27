import { create, toBinary } from '@bufbuild/protobuf';
import { afterEach, beforeEach, expect, test } from 'vitest';

import { db, op, schema } from '@app/drizzle';
import { handle } from '@app/event/notify.ts';
import { Notify, NotifyType } from '@app/lib/notify.ts';
import { NotifySchema } from '@app/vendor/proto/mq/v1/notify_pb.ts';

const testDestUserID = 900_002;
const testFromUserID = 287622;
const testMid = 1;
const testMids = [1, 2, 3, 4, 5];

beforeEach(async () => {
  await db.delete(schema.chiiUserFields).where(op.eq(schema.chiiUserFields.uid, testDestUserID));
  await db.insert(schema.chiiUserFields).values({
    uid: testDestUserID,
    site: '',
    location: '',
    bio: '',
    homepage: '',
    privacy: '',
    blocklist: '',
  });
});

afterEach(async () => {
  await db.delete(schema.chiiNotify).where(op.eq(schema.chiiNotify.uid, testDestUserID));
  await db.delete(schema.chiiNotifyField).where(op.inArray(schema.chiiNotifyField.rid, testMids));
  await db.delete(schema.chiiUserFields).where(op.eq(schema.chiiUserFields.uid, testDestUserID));
});

test('should handle event notify event', async () => {
  await handle({
    key: '',
    topic: '',
    value: Buffer.from(
      toBinary(
        NotifySchema,
        create(NotifySchema, {
          mid: testMid,
          title: 'fake title',
          type: 35,
          userId: testDestUserID,
          fromUserId: testFromUserID,
        }),
      ),
    ),
  });
});

test('should use mention notification privacy for mention notify types', async () => {
  await db
    .update(schema.chiiUserFields)
    .set({ privacy: '{"20":2,"21":0}' })
    .where(op.eq(schema.chiiUserFields.uid, testDestUserID));

  await db.transaction(async (t) => {
    await Notify.create(t, {
      destUserID: testDestUserID,
      sourceUserID: testFromUserID,
      createdAt: 1,
      type: NotifyType._23,
      relatedID: 2,
      mainID: 2,
      title: 'mention',
    });
  });

  await expect(fetchNotifyTypes()).resolves.toEqual([]);
});

test('should keep timeline status reply notify under comment notification privacy', async () => {
  await db
    .update(schema.chiiUserFields)
    .set({ privacy: '{"21":0,"30":2}' })
    .where(op.eq(schema.chiiUserFields.uid, testDestUserID));

  await db.transaction(async (t) => {
    await Notify.create(t, {
      destUserID: testDestUserID,
      sourceUserID: testFromUserID,
      createdAt: 1,
      type: NotifyType._22,
      relatedID: 3,
      mainID: 3,
      title: 'timeline reply',
    });
  });

  await expect(fetchNotifyTypes()).resolves.toEqual([NotifyType._22]);
});

test('should use friend notification privacy for friend notify types', async () => {
  await db
    .update(schema.chiiUserFields)
    .set({ privacy: '{"21":0,"23":2}' })
    .where(op.eq(schema.chiiUserFields.uid, testDestUserID));

  await db.transaction(async (t) => {
    await Notify.create(t, {
      destUserID: testDestUserID,
      sourceUserID: testFromUserID,
      createdAt: 1,
      type: NotifyType.RequestFriend,
      relatedID: 4,
      mainID: 4,
      title: 'friend',
    });
  });

  await expect(fetchNotifyTypes()).resolves.toEqual([]);
});

async function fetchNotifyTypes(): Promise<number[]> {
  const rows = await db
    .select({ type: schema.chiiNotify.type })
    .from(schema.chiiNotify)
    .where(op.eq(schema.chiiNotify.uid, testDestUserID))
    .orderBy(schema.chiiNotify.id);
  return rows.map((row) => row.type);
}
