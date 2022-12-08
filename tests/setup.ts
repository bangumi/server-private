import { beforeEach, afterAll, afterEach, beforeAll } from '@jest/globals';
import { register } from 'prom-client';

import redis from '../lib/redis';

beforeAll(async () => {
  await redis.flushdb('SYNC');
});

beforeEach(async () => {
  await redis.flushdb('SYNC');
  register.clear();
});

afterEach(async () => {
  await redis.flushdb('SYNC');
});

afterAll(async () => {
  await redis.quit();
});
