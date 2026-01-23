import { DateTime } from 'luxon';

import { logger } from '@app/lib/logger';
import redis from '@app/lib/redis.ts';
import {
  getInboxCacheKey,
  getInboxVisitCacheKey,
  getItemCacheKey,
  getUserCacheKey,
  getUserVisitCacheKey,
  TIMELINE_EVENT_CHANNEL,
} from '@app/lib/timeline/cache';
import { fetchFollowers } from '@app/lib/user/utils';

import { EventOp, type KafkaMessage } from './type';

interface Key {
  tml_id: number;
}

interface TimelineItem {
  tml_id: number;
  tml_uid: number;
  tml_cat: number;
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
        logger.error({ payload }, 'invalid timeline payload for create');
        return;
      }

      async function createTimeline(tml: TimelineItem) {
        // 始终写入全站时间线
        await redis.zadd(getInboxCacheKey(0, tml.tml_cat), tml.tml_id, tml.tml_id);

        const now = DateTime.now().toUnixInteger();
        const ttlUser = Number(await redis.get(getUserVisitCacheKey(tml.tml_uid, tml.tml_cat)));
        if (ttlUser > 0) {
          const userCacheKey = getUserCacheKey(tml.tml_uid, tml.tml_cat);
          await redis.zadd(userCacheKey, tml.tml_id, tml.tml_id);
          // 将 cache key 的过期时间设置为与 visit key 一致
          await redis.expire(userCacheKey, ttlUser - now);
        }
        const followerIDs = await fetchFollowers(tml.tml_uid);
        if (followerIDs.length > 0) {
          // 写入自己的首页时间线
          followerIDs.push(tml.tml_uid);
          const ttlInbox = await redis.mget(
            followerIDs.map((fid) => getInboxVisitCacheKey(fid, tml.tml_cat)),
          );
          for (const [idx, fid] of followerIDs.entries()) {
            const ttl = Number(ttlInbox[idx]);
            if (ttl > 0) {
              const inboxCacheKey = getInboxCacheKey(fid, tml.tml_cat);
              await redis.zadd(inboxCacheKey, tml.tml_id, tml.tml_id);
              await redis.expire(inboxCacheKey, ttl - now);
            }
          }
        }
        await redis.publish(
          TIMELINE_EVENT_CHANNEL,
          JSON.stringify({ tml_id: tml.tml_id, cat: tml.tml_cat, uid: tml.tml_uid }),
        );
      }
      const tml = payload.after;
      await createTimeline(tml);

      // 缓存未指定 cat 的副本
      const tmlCat0 = { ...tml, cat: 0 };
      await createTimeline(tmlCat0);
      break;
    }
    case EventOp.Delete: {
      if (!payload.before) {
        logger.error({ payload }, 'invalid timeline payload for delete');
        return;
      }
      async function deleteTimeline(tml: TimelineItem) {
        logger.info(`process timeline delete event: ${tml.tml_id}`);
        // 始终尝试从全站时间线中删除
        await redis.zrem(getInboxCacheKey(0, tml.tml_cat), tml.tml_id);

        await redis.zrem(getUserCacheKey(tml.tml_uid, tml.tml_cat), tml.tml_id);
        const followerIDs = await fetchFollowers(tml.tml_uid);
        if (followerIDs.length > 0) {
          // 也从自己的首页时间线中删除
          followerIDs.push(tml.tml_uid);
          for (const fid of followerIDs) {
            await redis.zrem(getInboxCacheKey(fid, tml.tml_cat), tml.tml_id);
          }
        }
        await redis.del(getItemCacheKey(idx.tml_id));
      }
      const tml = payload.before;
      await deleteTimeline(tml);

      // 删除未指定 cat 的副本
      const tmlCat0 = { ...tml, cat: 0 };
      await deleteTimeline(tmlCat0);
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
