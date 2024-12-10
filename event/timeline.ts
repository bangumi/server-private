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
import * as fetcher from '@app/lib/types/fetcher.ts';

import { EventOp } from './type';

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

export async function handle(key: string, value: string) {
  const idx = JSON.parse(key) as Key;
  const payload = JSON.parse(value) as Payload;

  switch (payload.op) {
    case EventOp.Create: {
      if (!payload.after) {
        logger.error('invalid timeline payload for create', payload);
        return;
      }
      const tml = payload.after;
      logger.info(`process timeline create event: ${tml.tml_id}`);
      const now = DateTime.now().toUnixInteger();
      const ttlUser = Number(await redis.get(getUserVisitCacheKey(tml.tml_uid)));
      if (ttlUser > 0) {
        const userCacheKey = getUserCacheKey(tml.tml_uid);
        await redis.zadd(userCacheKey, payload.after.tml_dateline, tml.tml_id);
        await redis.expire(userCacheKey, ttlUser - now);
      }
      const friendIDs = await fetcher.fetchFriendIDsByUserID(tml.tml_uid);
      if (friendIDs.length > 0) {
        const ttlInbox = await redis.mget(friendIDs.map((fid) => getInboxVisitCacheKey(fid)));
        for (const [idx, fid] of friendIDs.entries()) {
          const ttl = Number(ttlInbox[idx]);
          if (ttl > 0) {
            const inboxCacheKey = getInboxCacheKey(fid);
            await redis.zadd(inboxCacheKey, payload.after.tml_dateline, tml.tml_id);
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
      await redis.zrem(getUserCacheKey(tml.tml_uid), tml.tml_id);
      const friendIDs = await fetcher.fetchFriendIDsByUserID(tml.tml_uid);
      if (friendIDs.length > 0) {
        for (const fid of friendIDs) {
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
