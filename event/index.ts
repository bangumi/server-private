import { getSlimCacheKey } from '@app/lib/index/cache';
import redis from '@app/lib/redis.ts';

import { EventOp, type KafkaMessage } from './type';

interface IndexKey {
  idx_id: number;
}

interface Payload {
  op: EventOp;
}

export async function handle({ key, value }: KafkaMessage) {
  const idx = JSON.parse(key) as IndexKey;
  const payload = JSON.parse(value) as Payload;
  switch (payload.op) {
    case EventOp.Create: {
      break;
    }
    case EventOp.Update:
    case EventOp.Delete: {
      await redis.del(getSlimCacheKey(idx.idx_id));
      break;
    }
    case EventOp.Snapshot: {
      break;
    }
  }
}
