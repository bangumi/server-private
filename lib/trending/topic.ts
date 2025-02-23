import { db, op, schema } from '@app/drizzle';
import { logger } from '@app/lib/logger';
import redis from '@app/lib/redis.ts';
import type { TrendingItem, TrendingPeriod } from '@app/lib/trending/type.ts';
import { getTrendingDateline } from '@app/lib/trending/type.ts';

import { getTrendingSubjectTopicKey } from './cache';

export async function updateTrendingSubjectTopics(period: TrendingPeriod) {
  const trendingKey = getTrendingSubjectTopicKey(period);
  const lockKey = `lock:${trendingKey}`;
  if (await redis.get(lockKey)) {
    logger.info('Already calculating trending subject topics for (%s)...', period);
    return;
  }
  await redis.set(lockKey, 1, 'EX', 60);

  const minDateline = getTrendingDateline(period);
  logger.info('Calculating trending subject topics for (%s) from %d...', period, minDateline);

  const data = await db
    .select({
      topicID: schema.chiiSubjectPosts.mid,
      total: op.count(schema.chiiSubjectPosts.id),
    })
    .from(schema.chiiSubjectPosts)
    .where(op.and(op.gte(schema.chiiSubjectPosts.createdAt, minDateline)))
    .groupBy(schema.chiiSubjectPosts.mid)
    .orderBy(op.desc(op.count(schema.chiiSubjectPosts.id)))
    .limit(100);

  const ids = [];
  for (const item of data) {
    ids.push({ id: item.topicID, total: item.total } as TrendingItem);
  }

  logger.info('Trending subject topics for (%s) calculated: %d.', period, ids.length);
  await redis.set(trendingKey, JSON.stringify(ids));
  await redis.del(lockKey);
}
