import * as url from 'node:url';

import type { RedisOptions } from 'ioredis';
import { Redis } from 'ioredis';

import config from './config.ts';
import { intval } from './utils/index.ts';

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
