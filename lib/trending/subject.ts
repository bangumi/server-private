import { db, op, schema } from '@app/drizzle';
import { logger } from '@app/lib/logger';
import redis from '@app/lib/redis.ts';
import { SubjectType } from '@app/lib/subject/type.ts';
import type { TrendingItem } from '@app/lib/trending/type.ts';
import { getTrendingDateline, TrendingPeriod } from '@app/lib/trending/type.ts';

import { getTrendingSubjectKey } from './cache';

export async function updateTrendingSubjects(
  subjectType: SubjectType,
  period = TrendingPeriod.Month,
  flush = false,
) {
  const trendingKey = getTrendingSubjectKey(subjectType, period);
  const lockKey = `lock:${trendingKey}`;
  if (flush) {
    await redis.del(lockKey);
  }
  if (await redis.get(lockKey)) {
    logger.info('Already calculating trending subjects for %s(%s)...', subjectType, period);
    return;
  }
  await redis.set(lockKey, 1, 'EX', 3600);

  const minDateline = getTrendingDateline(period);
  let doingDateline = true;
  if (subjectType === SubjectType.Book || subjectType === SubjectType.Music) {
    doingDateline = false;
  }

  logger.info(
    'Calculating trending subjects for %s(%s) from %d ...',
    subjectType,
    period,
    minDateline,
  );

  const data = await db
    .select({ subjectID: schema.chiiSubjects.id, total: op.count(schema.chiiSubjects.id) })
    .from(schema.chiiSubjectInterests)
    .innerJoin(
      schema.chiiSubjects,
      op.eq(schema.chiiSubjects.id, schema.chiiSubjectInterests.subjectID),
    )
    .where(
      op.and(
        op.eq(schema.chiiSubjects.typeID, subjectType),
        op.ne(schema.chiiSubjects.ban, 1),
        doingDateline
          ? op.gt(schema.chiiSubjectInterests.doingDateline, minDateline)
          : op.gt(schema.chiiSubjectInterests.updatedAt, minDateline),
      ),
    )
    .groupBy(schema.chiiSubjects.id)
    .orderBy(op.desc(op.count(schema.chiiSubjects.id)))
    .limit(1000);

  const ids = [];
  for (const item of data) {
    ids.push({ id: item.subjectID, total: item.total } as TrendingItem);
  }
  logger.info('Trending subjects for %s(%s) calculated: %d.', subjectType, period, ids.length);
  await redis.set(trendingKey, JSON.stringify(ids));
  await redis.del(lockKey);
}
