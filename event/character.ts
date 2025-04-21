import { getSlimCacheKey } from '@app/lib/character/cache';
import redis from '@app/lib/redis.ts';

import { EventOp, type KafkaMessage } from './type';

interface CharacterKey {
  crt_id: number;
}

interface Payload {
  op: EventOp;
}

export async function handle({ key, value }: KafkaMessage) {
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
