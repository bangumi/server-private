import { jest, beforeEach } from '@jest/globals';
import MockRedis from 'ioredis-mock';
import { register } from 'prom-client';

jest.unstable_mockModule('../lib/redis', () => {
  return {
    default: new MockRedis(),
  };
});

beforeEach(() => {
  register.clear();
});
