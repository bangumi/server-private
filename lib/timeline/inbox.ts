import { DateTime } from 'luxon';

import { db, op } from '@app/drizzle/db.ts';
import * as schema from '@app/drizzle/schema';
import redis from '@app/lib/redis.ts';

import { getInboxCacheKey, getInboxVisitCacheKey } from './cache.ts';

export async function getTimelineInbox(
  uid: number,
  limit: number,
  offset: number,
): Promise<number[]> {
  const cacheKey = getInboxCacheKey(uid);
  const cacheCount = await redis.zcard(cacheKey);
  const ids = [];
  if (cacheCount > offset + limit) {
    const ret = await redis.zrevrange(cacheKey, offset, offset + limit - 1);
    if (ret) {
      ids.push(...ret.map(Number));
    }
  } else {
    const conditions = [];
    if (uid > 0) {
      const friendIDs = await db
        .select({ fid: schema.chiiFriends.fid })
        .from(schema.chiiFriends)
        .where(op.eq(schema.chiiFriends.uid, uid))
        .execute()
        .then((data) => data.map((d) => d.fid));
      if (friendIDs.length === 0) {
        return getTimelineInbox(0, limit, offset);
      }
      conditions.push(op.inArray(schema.chiiTimeline.uid, friendIDs));
    }
    const data = await db
      .select({ id: schema.chiiTimeline.id })
      .from(schema.chiiTimeline)
      .where(conditions.length > 0 ? op.and(...conditions) : undefined)
      .orderBy(op.desc(schema.chiiTimeline.id))
      .limit(limit)
      .offset(offset)
      .execute();
    ids.push(...data.map((d) => d.id));
  }
  // 标记访问，用于 debezium 判断是否需要更新 timeline 缓存
  const ttl = DateTime.now().toUnixInteger() + 604800;
  await redis.setex(getInboxVisitCacheKey(uid), 604800, ttl);
  return ids;
}
