import { getSlimCacheKey } from '@app/lib/person/cache';
import redis from '@app/lib/redis.ts';

import { EventOp } from './type';

interface PersonKey {
  prsn_id: number;
}

interface Payload {
  op: EventOp;
}

export async function handle(topic: string, key: string, value: string) {
  const idx = JSON.parse(key) as PersonKey;
  const payload = JSON.parse(value) as Payload;
  switch (payload.op) {
    case EventOp.Create: {
      break;
    }
    case EventOp.Update:
    case EventOp.Delete: {
      await redis.del(getSlimCacheKey(idx.prsn_id));
      break;
    }
    case EventOp.Snapshot: {
      break;
    }
  }
}
