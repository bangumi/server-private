import { beforeEach, describe, expect, test, vi } from 'vitest';

import { RedisLimiter } from '@app/lib/utils/rate-limit/redis.ts';

const { default: redis } = await vi.importActual<typeof import('@app/lib/redis.ts')>(
  '@app/lib/redis.ts',
);

describe('redis limit', () => {
  const limiter = new RedisLimiter({ redisClient: redis });
  const key = 'test-limit-key';

  beforeEach(async () => {
    await redis.del(key);
  });

  test('limit', async () => {
    const result1 = await limiter.get(key, 600, 10);
    expect(result1).toEqual({ limited: false, limit: 10, remain: 9, reset: 600 });

    const result2 = await limiter.get(key, 600, 10);
    expect(result2).toMatchObject({ limit: 10, remain: 8 });

    for (let i = 7; i > 0; i--) {
      const result = await limiter.get(key, 600, 10);
      expect(result).toMatchObject({ limit: 10, remain: i });
    }

    const limited = await limiter.get(key, 600, 10);
    expect(limited).toMatchObject({ limit: 10, remain: 0 });

    await expect(limiter.get(key, 600, 10)).resolves.toMatchObject({ limit: 10, remain: -1 });

    await expect(limiter.get(key, 600, 10)).resolves.toMatchObject({ limit: 10, remain: -1 });
  });
});
