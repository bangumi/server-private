import { jest } from '@jest/globals';
import MockRedis from 'ioredis-mock';

jest.unstable_mockModule('../lib/redis', () => {
  return {
    default: new MockRedis(),
  };
});
