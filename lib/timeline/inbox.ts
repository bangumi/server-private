import { DateTime } from 'luxon';

import { db, op, schema } from '@app/drizzle';
import redis from '@app/lib/redis.ts';

import { getInboxCacheKey, getInboxVisitCacheKey } from './cache.ts';

export async function getTimelineInbox(
  uid: number,
  limit: number,
  until?: number,
): Promise<number[]> {
  const cacheKey = getInboxCacheKey(uid);
  const ids = [];
  const max_id = until ? until - 1 : '+inf';
  const cached = await redis.zrevrangebyscore(cacheKey, max_id, '-inf', 'LIMIT', 0, limit);
  // 对全站时间线，只返回缓存数据
  if (cached.length === limit || uid === 0) {
    return cached.map(Number);
  }
  const conditions = [];
  const friendIDs = await db
    .select({ fid: schema.chiiFriends.fid })
    .from(schema.chiiFriends)
    .where(op.eq(schema.chiiFriends.uid, uid))
    .then((data) => data.map((d) => d.fid));
  // 对于没有好友的用户，返回全站时间线
  if (friendIDs.length === 0) {
    return getTimelineInbox(0, limit, until);
  }
  // 自己的动态也在需要首页显示
  friendIDs.push(uid);
  conditions.push(op.inArray(schema.chiiTimeline.uid, friendIDs));
  if (until) {
    conditions.push(op.lt(schema.chiiTimeline.id, until));
  }
  const data = await db
    .select({ id: schema.chiiTimeline.id })
    .from(schema.chiiTimeline)
    .where(conditions.length > 0 ? op.and(...conditions) : undefined)
    .orderBy(op.desc(schema.chiiTimeline.id))
    .limit(limit);
  ids.push(...data.map((d) => d.id));
  if (!until && ids.length > 0) {
    // 回填第一页的数据
    await redis.zadd(cacheKey, ...ids.flatMap((id) => [id, id]));
    await redis.expire(cacheKey, 1209600);
  }
  // 标记访问，用于 debezium 判断是否需要更新 timeline 缓存
  const ttl = DateTime.now().toUnixInteger() + 1209600;
  await redis.setex(getInboxVisitCacheKey(uid), 1209600, ttl);
  return ids;
}
