import { logger } from '@app/lib/logger';
import redis from '@app/lib/redis.ts';
import { getInboxCacheKey, getUserCacheKey } from '@app/lib/timeline/cache';

export async function truncateGlobalCache() {
  logger.info('Truncating global timeline cache...');
  const cacheKey = getInboxCacheKey(0);
  const [lastMember] = await redis.zrevrange(cacheKey, -1000, -1000, 'WITHSCORES');
  if (!lastMember) {
    return;
  }
  await redis.zremrangebyscore(cacheKey, '-inf', `(${lastMember}`);
}

export async function truncateUserCache() {
  logger.info('Truncating user timeline cache...');
  const keys = redis.scanStream({ match: getUserCacheKey('*'), type: 'zset' });
  for await (const key of keys) {
    const [lastMember] = await redis.zrevrange(key as string, -200, -200, 'WITHSCORES');
    if (!lastMember) {
      continue;
    }
    await redis.zremrangebyscore(key as string, '-inf', `(${lastMember}`);
  }
}

export async function truncateInboxCache() {
  logger.info('Truncating inbox timeline cache...');
  const keys = redis.scanStream({ match: getInboxCacheKey('*'), type: 'zset' });
  for await (const key of keys) {
    const [lastMember] = await redis.zrevrange(key as string, -200, -200, 'WITHSCORES');
    if (!lastMember) {
      continue;
    }
    await redis.zremrangebyscore(key as string, '-inf', `(${lastMember}`);
  }
}
