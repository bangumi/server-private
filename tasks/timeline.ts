import { logger } from '@app/lib/logger';
import redis from '@app/lib/redis.ts';
import { getInboxCacheKey, getUserCacheKey } from '@app/lib/timeline/cache';

export async function truncateGlobalCache() {
  logger.info('Truncating global timeline cache...');
  const cacheKey = getInboxCacheKey(0);
  logger.info(`Truncating global timeline cache with key: ${cacheKey}`);
  await redis.zremrangebyrank(cacheKey, 0, -1001);
}

export async function truncateUserCache() {
  logger.info('Truncating user timeline cache...');
  const keys = redis.scanStream({ match: getUserCacheKey('*'), type: 'zset' });
  for await (const key of keys) {
    logger.info(`Truncating user timeline cache with key: ${key}`);
    await redis.zremrangebyrank(key as string, 0, -201);
  }
}

export async function truncateInboxCache() {
  logger.info('Truncating inbox timeline cache...');
  const keys = redis.scanStream({ match: getInboxCacheKey('*'), type: 'zset' });
  for await (const key of keys) {
    logger.info(`Truncating inbox timeline cache with key: ${key}`);
    await redis.zremrangebyrank(key as string, 0, -201);
  }
}
