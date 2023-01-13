import * as url from 'node:url';

import type { RedisOptions } from 'ioredis';
import IORedis from 'ioredis';

import config from './config';

const u = url.parse(config.redis.uri);

const [username, password] = (u.auth ?? '').split(':', 2);

export const redisOption = {
  host: u.hostname ?? '127.0.0.1',
  port: u.port ? Number.parseInt(u.port) : 3306,
  db: u.pathname ? Number.parseInt(u.pathname.slice(1)) : 0,
  username,
  password,
  lazyConnect: true,
} satisfies RedisOptions;

export default new IORedis(redisOption);
export const Subscriber = new IORedis(redisOption);
