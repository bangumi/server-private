import { beforeEach, afterAll, jest } from '@jest/globals';
import { register } from 'prom-client';

import redis from '../lib/redis';

jest.unstable_mockModule('../lib/externals/hcaptcha', () => {
  return {
    HCaptcha: class {
      verify(res: string): Promise<boolean> {
        return Promise.resolve(res === 'fake-response');
      }
    },
  };
});

beforeEach(() => {
  register.clear();
});

afterAll(async () => {
  await redis.quit();
});
