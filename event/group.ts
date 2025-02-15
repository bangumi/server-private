import { getSlimCacheKey } from '@app/lib/group/cache';
import redis from '@app/lib/redis.ts';
import { getJoinedGroupsCacheKey } from '@app/lib/user/cache.ts';

import { EventOp } from './type';

interface GroupPayload {
  op: EventOp;
}

interface GroupKey {
  grp_id: number;
}

export async function handle(key: string, value: string) {
  const idx = JSON.parse(key) as GroupKey;
  const payload = JSON.parse(value) as GroupPayload;
  switch (payload.op) {
    case EventOp.Create: {
      break;
    }
    case EventOp.Update:
    case EventOp.Delete: {
      await redis.del(getSlimCacheKey(idx.grp_id));
      break;
    }
    case EventOp.Snapshot: {
      break;
    }
  }
}

interface GroupMemberPayload {
  op: EventOp;
  before?: {
    gmb_uid: number;
    gmb_gid: number;
  };
  after?: {
    gmb_uid: number;
    gmb_gid: number;
  };
}

export async function handleMember(_: string, value: string) {
  const payload = JSON.parse(value) as GroupMemberPayload;
  const uid = payload.before?.gmb_uid ?? payload.after?.gmb_uid;
  if (!uid) {
    return;
  }

  switch (payload.op) {
    case EventOp.Create:
    case EventOp.Update:
    case EventOp.Delete: {
      await redis.del(getJoinedGroupsCacheKey(uid));
      break;
    }
    case EventOp.Snapshot: {
      break;
    }
  }
}
