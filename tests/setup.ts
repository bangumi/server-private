import { afterAll } from '@jest/globals';

import redis from '../lib/redis';

afterAll(async () => {
  await redis.quit();
});
