import * as fs from 'node:fs';
import * as path from 'node:path';

import type { Redis } from 'ioredis';

import { projectRoot, redisPrefix } from '@app/lib/config.ts';
import type { Limiter, Result } from '@app/lib/utils/rate-limit/index.ts';

const luaScript = fs.readFileSync(
  path.join(projectRoot, 'lib/utils/rate-limit/redis-script.lua'),
  'utf8',
);

export class RedisLimiter implements Limiter {
  private readonly redisClient: Redis;

  constructor({ redisClient }: { redisClient: Redis }) {
    this.redisClient = redisClient;

    this.redisClient.defineCommand('getRateLimit', {
      numberOfKeys: 1,
      lua: luaScript,
    });
  }

  async get(key: string, timeWindow: number, limit: number): Promise<Result> {
    const [remain, reset] = await this.redisClient.getRateLimit(key, limit, timeWindow);
    return {
      limited: remain < 0,
      remain,
      limit,
      reset,
    };
  }

  async userAction(
    userID: number,
    action: string,
    timeWindow: number,
    limit: number,
  ): Promise<Result> {
    const limitKey = `${redisPrefix}:rate-limit:${action}:${userID}`;

    return this.get(limitKey, timeWindow, limit);
  }

  async reset(key: string): Promise<void> {
    await this.redisClient.del(key);
  }
}

// work with defineCommand
declare module 'ioredis' {
  interface RedisCommander {
    getRateLimit(key: string, limit: number, duration: number): Promise<[number, number]>;
  }
}
