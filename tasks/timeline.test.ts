import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { getInboxCacheKey } from '@app/lib/timeline/cache';
import redis from '@app/lib/redis.ts';

import { truncateGlobalCache } from './timeline.ts';

describe('truncate global cache', () => {
  beforeEach(async () => {
    await redis.flushall();
  });

  afterEach(async () => {
    await redis.flushall();
  });

  test('should truncate global cache', async () => {
    const cacheKey = getInboxCacheKey(0);
    // generate 1500 members
    const members = Array.from({ length: 1500 }, (_, i) => i + 1);
    await redis.zadd(cacheKey, ...members.map((m) => [m, m]).flat());
    const countBefore = await redis.zcard(cacheKey);
    expect(countBefore).toBe(1500);

    await truncateGlobalCache();

    const countAfter = await redis.zcard(cacheKey);
    expect(countAfter).toBe(1000);

    const leadingMembers = await redis.zrevrangebyscore(cacheKey, '+inf', '-inf', 'LIMIT', 0, 10);
    expect(leadingMembers).toEqual(
      members
        .slice(1500 - 10, 1500)
        .reverse()
        .map(String),
    );

    const trailingMembers = await redis.zrange(cacheKey, 0, 10);
    expect(trailingMembers).toEqual(members.slice(500, 511).map(String));
  });
});
