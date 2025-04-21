import { getSlimCacheKey, getTopicCacheKey } from '@app/lib/group/cache.ts';
import redis from '@app/lib/redis.ts';
import { getJoinedGroupsCacheKey } from '@app/lib/user/cache.ts';

import { EventOp, type KafkaMessage } from './type';

interface GroupKey {
  grp_id: number;
}

interface GroupPayload {
  op: EventOp;
}

export async function handle({ key, value }: KafkaMessage) {
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

export async function handleMember({ value }: KafkaMessage) {
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

interface GroupTopicKey {
  grp_tpc_id: number;
}

interface GroupTopicPayload {
  op: EventOp;
}

export async function handleTopic({ key, value }: KafkaMessage) {
  const idx = JSON.parse(key) as GroupTopicKey;
  const payload = JSON.parse(value) as GroupTopicPayload;
  switch (payload.op) {
    case EventOp.Create: {
      break;
    }
    case EventOp.Update:
    case EventOp.Delete: {
      await redis.del(getTopicCacheKey(idx.grp_tpc_id));
      break;
    }
  }
}
