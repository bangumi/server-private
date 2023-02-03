import * as url from 'node:url';

import type { RedisOptions } from 'ioredis';
import { Redis } from 'ioredis';

import config, { redisPrefix } from './config';
import { intval } from './utils';

const u = url.parse(config.redisUri);

const [username, password] = (u.auth ?? '').split(':', 2);

export const redisOption = {
  host: u.hostname ?? '127.0.0.1',
  port: u.port ? intval(u.port) : 3306,
  db: u.pathname ? intval(u.pathname.slice(1)) : 0,
  username,
  password,
  lazyConnect: true,
} satisfies RedisOptions;

const redis = new Redis(redisOption);
export default redis;
export const Subscriber = new Redis(redisOption);

/**
 * @param key - Redis key without global prefix
 * @param getter - 在缓存中未找到时获取完整数据
 * @param ttl - Time to live in seconds
 */
export async function cached<T>({
  key,
  getter,
  ttl,
}: {
  key: string;
  getter: () => Promise<T | undefined>;
  ttl: number;
}): Promise<T | undefined> {
  key = redisPrefix + '-' + key;

  const cached = await redis.get(key);
  if (cached) {
    return JSON.parse(cached) as T;
  }

  const data = await getter();
  if (!data) {
    return;
  }

  await redis.setex(key, ttl, JSON.stringify(data));

  return data;
}
