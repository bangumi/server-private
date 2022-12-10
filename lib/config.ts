import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import url from 'node:url';

import type { RedisOptions } from 'ioredis';

export const production = process.env.NODE_ENV === 'production';
export const testing = process.env.NODE_ENV === 'test';

export const projectRoot = url.fileURLToPath(new URL('..', import.meta.url));
export const pkg = JSON.parse(
  fs.readFileSync(path.resolve(projectRoot, 'package.json'), 'utf8'),
) as { version: string };

export const redisPrefix = `graphql-${pkg.version}`;

const u = url.parse(process.env.REDIS_URI ?? 'redis://127.0.0.1:3306/0');

const [username, password] = (u.auth ?? '').split(':', 2);

export const redisOption = {
  host: u.hostname ?? '127.0.0.1',
  port: u.port ? Number.parseInt(u.port) : 3306,
  db: u.pathname ? Number.parseInt(u.pathname.slice(1)) : 0,
  username: username,
  password: password,
  lazyConnect: true,
} satisfies RedisOptions;
