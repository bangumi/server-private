import { describe, test, expect, jest } from '@jest/globals';
import MockRedis from 'ioredis-mock';

import * as auth from '../lib/auth';

jest.unstable_mockModule('../lib/redis', () => {
  return {
    default: new MockRedis(),
  };
});

describe('should auth', () => {
  test('current auth', async () => {
    const user = await auth.byToken('a_development_access_token');
    expect(user.permission.report).toBe(true);
    expect(user.user).toMatchSnapshot();

    const cached = await auth.byToken('a_development_access_token');
    expect(cached.permission.report).toBe(true);
    expect(cached.user).toMatchSnapshot();
  });
});
