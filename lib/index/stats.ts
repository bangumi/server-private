import { DateTime } from 'luxon';

import { db, op, schema } from '@app/drizzle';
import { IndexRelatedCategory } from '@app/lib/index/types.ts';
import redis from '@app/lib/redis.ts';
import { SubjectType } from '@app/lib/subject/type.ts';

import { getSlimCacheKey } from './cache';

export async function updateIndexStats(indexId: number) {
  const now = DateTime.now().toUnixInteger();
  await db.transaction(async (tx) => {
    const data = await tx
      .select({
        cat: schema.chiiIndexRelated.cat,
        type: schema.chiiIndexRelated.type,
        count: op.countDistinct(schema.chiiIndexRelated.sid),
      })
      .from(schema.chiiIndexRelated)
      .where(
        op.and(op.eq(schema.chiiIndexRelated.rid, indexId), op.eq(schema.chiiIndexRelated.ban, 0)),
      )
      .groupBy(schema.chiiIndexRelated.cat, schema.chiiIndexRelated.type);

    const stats: Record<string, number> = {};
    let total = 0;

    for (const { cat, type, count } of data) {
      total += count;
      if (cat === IndexRelatedCategory.Subject) {
        switch (type) {
          case SubjectType.Anime: {
            stats['1'] = count;
            break;
          }
          case SubjectType.Book: {
            stats['2'] = count;
            break;
          }
          case SubjectType.Music: {
            stats['3'] = count;
            break;
          }
          case SubjectType.Game: {
            stats['4'] = count;
            break;
          }
          case SubjectType.Real: {
            stats['6'] = count;
            break;
          }
        }
      } else {
        switch (cat) {
          case IndexRelatedCategory.Character: {
            stats.character = count;
            break;
          }
          case IndexRelatedCategory.Person: {
            stats.person = count;
            break;
          }
          case IndexRelatedCategory.Ep: {
            stats.ep = count;
            break;
          }
          case IndexRelatedCategory.Blog: {
            stats.blog = count;
            break;
          }
          case IndexRelatedCategory.GroupTopic: {
            stats.group_topic = count;
            break;
          }
          case IndexRelatedCategory.SubjectTopic: {
            stats.subject_topic = count;
            break;
          }
        }
      }
    }

    const statsString = JSON.stringify(stats);

    await tx
      .update(schema.chiiIndexes)
      .set({ stats: statsString, total, updatedAt: now })
      .where(op.eq(schema.chiiIndexes.id, indexId));
  });

  await redis.del(getSlimCacheKey(indexId));
}
