import { db, op, schema } from '@app/drizzle';
import redis from '@app/lib/redis.ts';
import * as convert from '@app/lib/types/convert.ts';
import type * as res from '@app/lib/types/res.ts';

import { getFamousGroupsCacheKey } from './cache.ts';

const CACHE_TTL = 3600;

/** Cached: 热门小组，对齐 PHP ChartCore::FamousGroup */
export async function fetchFamousGroups(): Promise<res.ISlimGroup[]> {
  const cacheKey = getFamousGroupsCacheKey();
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached) as res.ISlimGroup[];
  }

  const data = await db
    .select()
    .from(schema.chiiGroups)
    .where(op.eq(schema.chiiGroups.nsfw, false))
    .orderBy(op.desc(schema.chiiGroups.members), op.sql`rand()`)
    .limit(10);
  const result = data.map((group) => convert.toSlimGroup(group));
  await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(result));
  return result;
}
