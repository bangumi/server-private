import redis from '@app/lib/redis.ts';
import {
  getFollowersCacheKey,
  getFriendsCacheKey,
  getRelationCacheKey,
  getSlimCacheKey,
} from '@app/lib/user/cache';

import { EventOp } from './type';

interface Payload {
  op: EventOp;
}

interface UserKey {
  uid: number;
}

interface FriendKey {
  uid: number;
  fid: number;
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

export async function handleFriend(key: string, value: string) {
  const idx = JSON.parse(key) as FriendKey;
  const payload = JSON.parse(value) as Payload;
  switch (payload.op) {
    case EventOp.Create: {
      break;
    }
    case EventOp.Update: {
      break;
    }
    case EventOp.Delete: {
      await redis.del(
        getFriendsCacheKey(idx.uid),
        getFollowersCacheKey(idx.fid),
        getRelationCacheKey(idx.uid, idx.fid),
      );
      break;
    }
    case EventOp.Snapshot: {
      break;
    }
  }
}
