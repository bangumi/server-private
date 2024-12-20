import { db, op } from '@app/drizzle/db.ts';
import type * as orm from '@app/drizzle/orm.ts';
import * as schema from '@app/drizzle/schema';
import redis from '@app/lib/redis.ts';
import type * as res from '@app/lib/types/res.ts';

import { getItemCacheKey } from './cache.ts';
import { parse as parseTimelineMemo } from './memo';

export function toTimeline(tml: orm.ITimeline): res.ITimeline {
  return {
    id: tml.id,
    uid: tml.uid,
    cat: tml.cat,
    type: tml.type,
    memo: parseTimelineMemo(tml.cat, tml.type, tml.batch, tml.memo),
    batch: tml.batch,
    replies: tml.replies,
    source: tml.source,
    createdAt: tml.createdAt,
  };
}
/** 优先从缓存中获取时间线数据，如果缓存中没有则从数据库中获取， 并将获取到的数据缓存到 Redis 中。 */
export async function fetchTimelineByIDs(ids: number[]): Promise<Record<number, res.ITimeline>> {
  const cached = await redis.mget(ids.map((id) => getItemCacheKey(id)));
  const result: Record<number, res.ITimeline> = {};
  const uids = new Set<number>();
  const missing = [];
  for (const tid of ids) {
    if (cached[tid]) {
      const item = JSON.parse(cached[tid]) as res.ITimeline;
      uids.add(item.uid);
      result[tid] = item;
    } else {
      missing.push(tid);
    }
  }
  if (missing.length > 0) {
    const data = await db
      .select()
      .from(schema.chiiTimeline)
      .where(op.inArray(schema.chiiTimeline.id, missing))
      .execute();
    for (const d of data) {
      const item = toTimeline(d);
      uids.add(item.uid);
      result[d.id] = item;
      await redis.setex(getItemCacheKey(d.id), 604800, JSON.stringify(item));
    }
  }
  return result;
}
