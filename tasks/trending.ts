import { db, op } from '@app/drizzle/db.ts';
import * as schema from '@app/drizzle/schema';
import { logger } from '@app/lib/logger';
import redis from '@app/lib/redis.ts';
import { SubjectType, SubjectTypeValues } from '@app/lib/subject/type.ts';

interface TrendingItem {
  id: number;
  total: number;
}

async function updateTrendingSubjects(subjectType: SubjectType, period = 'month', flush = false) {
  const trendingKey = `trending:subjects:${subjectType}:${period}`;
  const lockKey = `lock:${trendingKey}`;
  if (flush) {
    await redis.del(lockKey);
  }
  if (await redis.get(lockKey)) {
    logger.info('Already calculating trending subjects for %s(%s)...', subjectType, period);
    return;
  }
  await redis.set(lockKey, 1, 'EX', 3600);
  logger.info('Calculating trending subjects for %s(%s)...', subjectType, period);

  const now = Date.now();
  const duration = {
    all: now,
    day: 86400,
    week: 86400 * 7,
    month: 86400 * 30,
  }[period];
  if (!duration) {
    logger.error('Invalid period: %s', period);
    return;
  }
  const minDateline = now - duration;
  let doingDateline = true;
  if (subjectType === SubjectType.Book || subjectType === SubjectType.Music) {
    doingDateline = false;
  }

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
        doingDateline
          ? op.gt(schema.chiiSubjectInterests.doingDateline, minDateline)
          : op.gt(schema.chiiSubjectInterests.updatedAt, minDateline),
      ),
    )
    .groupBy(schema.chiiSubjects.id)
    .orderBy(op.desc(op.count(schema.chiiSubjects.id)))
    .limit(1000)
    .execute();

  const ids = [];
  for (const item of data) {
    ids.push({ id: item.subjectID, total: item.total } as TrendingItem);
  }
  await redis.set(trendingKey, JSON.stringify(ids));
  await redis.del(lockKey);
}

export async function trendingSubjects() {
  for (const subjectType of SubjectTypeValues) {
    await updateTrendingSubjects(subjectType, 'month');
  }
}
