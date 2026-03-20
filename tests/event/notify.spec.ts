import { create, toBinary } from '@bufbuild/protobuf';
import { afterEach, beforeEach, test } from 'vitest';

import { db, schema } from '@app/drizzle';
import { handle } from '@app/event/notify.ts';
import { NotifySchema } from '@app/vendor/proto/mq/v1/notify_pb.ts';

beforeEach(async () => {
  await db.delete(schema.chiiNotify);
  await db.delete(schema.chiiNotifyField);
});

afterEach(async () => {
  await db.delete(schema.chiiNotify);
  await db.delete(schema.chiiNotifyField);
});

test('should handle event notify event', async () => {
  await handle({
    key: '',
    topic: '',
    value: Buffer.from(
      toBinary(
        NotifySchema,
        create(NotifySchema, { mid: 1, title: 'fake title', type: 35, userId: 4, fromUserId: 0 }),
      ),
    ).toString('utf8'),
  });
});
