import { DateTime } from 'luxon';

import { db, op } from '@app/drizzle/db.ts';
import * as schema from '@app/drizzle/schema';
import redis from '@app/lib/redis.ts';

import { getUserCacheKey, getUserVisitCacheKey } from './cache.ts';

export async function getTimelineUser(
  uid: number,
  limit: number,
  until?: number,
): Promise<number[]> {
  const cacheKey = getUserCacheKey(uid);
  const ids = [];
  const cached = await redis.zrevrangebyscore(cacheKey, until ?? '+inf', '-inf', 'LIMIT', 0, limit);
  if (cached.length === limit) {
    ids.push(...cached.map(Number));
  } else {
    const data = await db
      .select({ id: schema.chiiTimeline.id })
      .from(schema.chiiTimeline)
      .where(
        op.and(
          until ? op.lt(schema.chiiTimeline.id, until) : undefined,
          op.eq(schema.chiiTimeline.uid, uid),
        ),
      )
      .orderBy(op.desc(schema.chiiTimeline.id))
      .limit(limit)
      .execute();
    ids.push(...data.map((d) => d.id));
    if (!until) {
      // 回填第一页的数据
      await redis.zadd(cacheKey, ...ids.flatMap((id) => [id, id]));
      await redis.expire(cacheKey, 1209600);
    }
  }
  // 标记访问，用于 debezium 判断是否需要更新 timeline 缓存
  const ttl = DateTime.now().toUnixInteger() + 1209600;
  await redis.setex(getUserVisitCacheKey(uid), 1209600, ttl);
  return ids;
}
