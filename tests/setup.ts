import { vi } from 'vitest';
import MockRedis from 'ioredis-mock';

vi.mock('../lib/redis', () => {
  return {
    default: new MockRedis(),
  };
});

vi.mock('../lib/externals/hcaptcha', () => {
  return {
    HCaptcha: class {
      verify(res: string): Promise<boolean> {
        return Promise.resolve(res === 'fake-response');
      }
    },
  };
});
