import { create, toBinary } from '@bufbuild/protobuf';
import { afterEach, beforeEach, test } from 'vitest';

import { db, op, schema } from '@app/drizzle';
import { handle } from '@app/event/notify.ts';
import { NotifySchema } from '@app/vendor/proto/mq/v1/notify_pb.ts';

const testDestUserID = 382951;
const testFromUserID = 287622;
const testMid = 1;

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
  await db.delete(schema.chiiNotifyField).where(op.eq(schema.chiiNotifyField.rid, testMid));
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
