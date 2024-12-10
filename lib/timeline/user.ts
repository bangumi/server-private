import { DateTime } from 'luxon';

import { db, op } from '@app/drizzle/db.ts';
import * as schema from '@app/drizzle/schema';
import redis from '@app/lib/redis.ts';

import { getUserCacheKey, getUserVisitCacheKey } from './cache.ts';

export async function getTimelineUser(
  uid: number,
  limit: number,
  offset: number,
): Promise<number[]> {
  const cacheKey = getUserCacheKey(uid);
  const cacheCount = await redis.zcard(cacheKey);
  const ids = [];
  if (cacheCount > offset + limit) {
    const ret = await redis.zrevrange(cacheKey, offset, offset + limit - 1);
    if (ret) {
      ids.push(...ret.map(Number));
    }
  } else {
    const data = await db
      .select({ id: schema.chiiTimeline.id })
      .from(schema.chiiTimeline)
      .where(op.eq(schema.chiiTimeline.uid, uid))
      .orderBy(op.desc(schema.chiiTimeline.id))
      .limit(limit)
      .offset(offset)
      .execute();
    ids.push(...data.map((d) => d.id));
  }
  // 标记访问，用于 debezium 判断是否需要更新 timeline 缓存
  const ttl = DateTime.now().toUnixInteger() + 604800;
  await redis.setex(getUserVisitCacheKey(uid), 604800, ttl);
  return ids;
}
