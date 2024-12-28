import redis from '@app/lib/redis.ts';
import { getSlimCacheKey } from '@app/lib/user/cache';

import { EventOp } from './type';

interface UserKey {
  uid: number;
}

interface Payload {
  op: EventOp;
}

export async function handle(key: string, value: string) {
  const idx = JSON.parse(key) as UserKey;
  const payload = JSON.parse(value) as Payload;
  switch (payload.op) {
    case EventOp.Create: {
      break;
    }
    case EventOp.Update:
    case EventOp.Delete: {
      await redis.del(getSlimCacheKey(idx.uid));
      break;
    }
    case EventOp.Snapshot: {
      break;
    }
  }
}
