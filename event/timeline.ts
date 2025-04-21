import { DateTime } from 'luxon';

import { logger } from '@app/lib/logger';
import redis from '@app/lib/redis.ts';
import {
  getInboxCacheKey,
  getInboxVisitCacheKey,
  getItemCacheKey,
  getUserCacheKey,
  getUserVisitCacheKey,
} from '@app/lib/timeline/cache';
import { fetchFollowers } from '@app/lib/user/utils';

import { EventOp, type KafkaMessage } from './type';

interface Key {
  tml_id: number;
}

interface TimelineItem {
  tml_id: number;
  tml_uid: number;
  tml_dateline: number;
}

interface Payload {
  op: EventOp;
  before: TimelineItem | null;
  after: TimelineItem | null;
}

export async function handle({ key, value }: KafkaMessage) {
  const idx = JSON.parse(key) as Key;
  const payload = JSON.parse(value) as Payload;

  switch (payload.op) {
    case EventOp.Create: {
      if (!payload.after) {
        logger.error('invalid timeline payload for create', payload);
        return;
      }
      const tml = payload.after;
      // 始终写入全站时间线
      await redis.zadd(getInboxCacheKey(0), tml.tml_id, tml.tml_id);

      const now = DateTime.now().toUnixInteger();
      const ttlUser = Number(await redis.get(getUserVisitCacheKey(tml.tml_uid)));
      if (ttlUser > 0) {
        const userCacheKey = getUserCacheKey(tml.tml_uid);
        await redis.zadd(userCacheKey, tml.tml_id, tml.tml_id);
        // 将 cache key 的过期时间设置为与 visit key 一致
        await redis.expire(userCacheKey, ttlUser - now);
      }
      const followerIDs = await fetchFollowers(tml.tml_uid);
      if (followerIDs.length > 0) {
        // 写入自己的首页时间线
        followerIDs.push(tml.tml_uid);
        const ttlInbox = await redis.mget(followerIDs.map((fid) => getInboxVisitCacheKey(fid)));
        for (const [idx, fid] of followerIDs.entries()) {
          const ttl = Number(ttlInbox[idx]);
          if (ttl > 0) {
            const inboxCacheKey = getInboxCacheKey(fid);
            await redis.zadd(inboxCacheKey, tml.tml_id, tml.tml_id);
            await redis.expire(inboxCacheKey, ttl - now);
          }
        }
      }
      break;
    }
    case EventOp.Delete: {
      if (!payload.before) {
        logger.error('invalid timeline payload for delete', payload);
        return;
      }
      const tml = payload.before;
      logger.info(`process timeline delete event: ${tml.tml_id}`);
      // 始终尝试从全站时间线中删除
      await redis.zrem(getInboxCacheKey(0), tml.tml_id);

      await redis.zrem(getUserCacheKey(tml.tml_uid), tml.tml_id);
      const followerIDs = await fetchFollowers(tml.tml_uid);
      if (followerIDs.length > 0) {
        // 也从自己的首页时间线中删除
        followerIDs.push(tml.tml_uid);
        for (const fid of followerIDs) {
          await redis.zrem(getInboxCacheKey(fid), tml.tml_id);
        }
      }
      await redis.del(getItemCacheKey(idx.tml_id));
      break;
    }
    case EventOp.Update: {
      await redis.del(getItemCacheKey(idx.tml_id));
      break;
    }
    case EventOp.Snapshot: {
      // do nothing
      break;
    }
  }
}
