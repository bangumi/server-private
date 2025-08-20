import { create, toBinary } from '@bufbuild/protobuf';
import { afterEach, beforeEach, test } from 'vitest';

import { db, schema } from '@app/drizzle';
import { handle } from '@app/event/notify.ts';
import { NotifySchema } from '@app/vendor/proto/mq/v1/notify_pb.ts';

beforeEach(async () => {
  await db.delete(schema.chiiOsWebSessions);
});

afterEach(async () => {
  await db.delete(schema.chiiOsWebSessions);
});

test('should handle event notify event', async () => {
  await handle({
    key: '',
    topic: '',
    value: Buffer.from(
      toBinary(
        NotifySchema,
        create(NotifySchema, { mid: 1, title: 'fake title', type: 3, userId: 4 }),
      ),
    ).toString('utf8'),
  });
});
