import redis from '@app/lib/redis.ts';
import {
  getFollowersCacheKey,
  getFriendsCacheKey,
  getRelationCacheKey,
  getSlimCacheKey,
} from '@app/lib/user/cache';

import { EventOp, type KafkaMessage } from './type';

interface UserPayload {
  op: EventOp;
}

interface UserKey {
  uid: number;
}

export async function handle({ key, value }: KafkaMessage) {
  const idx = JSON.parse(key) as UserKey;
  const payload = JSON.parse(value) as UserPayload;
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

interface FriendPayload {
  op: EventOp;
  before?: {
    frd_uid: number;
    frd_fid: number;
  };
  after?: {
    frd_uid: number;
    frd_fid: number;
  };
}

export async function handleFriend({ value }: KafkaMessage) {
  const payload = JSON.parse(value) as FriendPayload;
  const uid = payload.before?.frd_uid ?? payload.after?.frd_uid;
  const fid = payload.before?.frd_fid ?? payload.after?.frd_fid;

  if (!uid || !fid) {
    return;
  }
  switch (payload.op) {
    case EventOp.Create:
    case EventOp.Update:
    case EventOp.Delete: {
      await redis.del(
        getFriendsCacheKey(uid),
        getFollowersCacheKey(fid),
        getRelationCacheKey(uid, fid),
      );
      break;
    }
    case EventOp.Snapshot: {
      break;
    }
  }
}
