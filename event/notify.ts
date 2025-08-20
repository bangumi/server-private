import { fromBinary } from '@bufbuild/protobuf';
import { DateTime } from 'luxon';

import { db } from '@app/drizzle';
import { Notify, type NotifyType } from '@app/lib/notify.ts';
import { NotifySchema } from '@app/vendor/proto/mq/notify_pb';

import { type KafkaMessage } from './type';

export async function handle({ value }: KafkaMessage) {
  const payload = fromBinary(NotifySchema, Buffer.from(value, 'utf8'));

  await db.transaction(async (t) => {
    await Notify.create(t, {
      destUserID: payload.userId,
      sourceUserID: 0,
      createdAt: DateTime.now().toUnixInteger(),
      type: payload.type as NotifyType,
      relatedID: payload.mid,
      mainID: payload.mid,
      title: payload.title,
    });
  });
}
