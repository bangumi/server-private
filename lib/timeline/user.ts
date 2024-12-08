import { db, op } from '@app/drizzle/db.ts';
import * as schema from '@app/drizzle/schema';
import redis from '@app/lib/redis.ts';

function getUserCacheKey(uid: number) {
  return `tml:user:${uid}`;
}

function getUserVisitCacheKey(uid: number) {
  return `tml:visit:user:${uid}`;
}

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
  const visitCacheKey = getUserVisitCacheKey(uid);
  await redis.setex(visitCacheKey, 604800, '1');
  return ids;
}
