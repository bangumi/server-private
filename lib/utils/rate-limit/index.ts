import fs from 'node:fs';
import path from 'node:path';
import * as url from 'node:url';

import type { Redis } from 'ioredis';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

const luaScript = fs.readFileSync(path.join(__dirname, './lua/get_token.lua')).toString();

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
      reset: Number.parseInt(result[1], 10),
    };
  }
}

// work with defineCommand
declare module 'ioredis' {
  interface RedisCommander {
    getRateLimit(key: string, limit: number, duration: number): Promise<[number, string]>;
  }
}
