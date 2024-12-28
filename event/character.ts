import { getSlimCacheKey } from '@app/lib/character/cache';
import redis from '@app/lib/redis.ts';

import { EventOp } from './type';

interface CharacterKey {
  crt_id: number;
}

interface Payload {
  op: EventOp;
}

export async function handle(key: string, value: string) {
  const idx = JSON.parse(key) as CharacterKey;
  const payload = JSON.parse(value) as Payload;
  switch (payload.op) {
    case EventOp.Create: {
      break;
    }
    case EventOp.Update:
    case EventOp.Delete: {
      await redis.del(getSlimCacheKey(idx.crt_id));
      break;
    }
    case EventOp.Snapshot: {
      break;
    }
  }
}
