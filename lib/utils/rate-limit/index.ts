import * as fs from 'node:fs';
import * as path from 'node:path';

import type { Redis } from 'ioredis';

import { projectRoot } from '@app/lib/config';
import { intval } from '@app/lib/utils';

const luaScript = fs
  .readFileSync(path.join(projectRoot, 'lib/utils/rate-limit/lua/get_token.lua'))
  .toString();

export default class Limiter {
  private readonly redisClient: Redis;
  private readonly limit: number;
  private readonly duration: number;

  constructor({
    redisClient,
    limit = 10,
    duration = 60,
  }: {
    redisClient: Redis;
    limit?: number;
    duration?: number;
  }) {
    this.redisClient = redisClient;
    this.limit = limit;
    this.duration = duration;

    this.redisClient.defineCommand('getRateLimit', {
      numberOfKeys: 1,
      lua: luaScript,
    });
  }

  async get(key: string): Promise<{ remain: number; reset: number }> {
    const result = await this.redisClient.getRateLimit(key, this.limit, this.duration);
    return {
      remain: result[0],
      reset: intval(result[1]),
    };
  }

  async reset(key: string): Promise<void> {
    await this.redisClient.del(key);
  }
}

// work with defineCommand
declare module 'ioredis' {
  interface RedisCommander {
    getRateLimit(key: string, limit: number, duration: number): Promise<[number, string]>;
  }
}
