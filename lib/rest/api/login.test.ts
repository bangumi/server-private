import { beforeEach, describe, expect, test } from '@jest/globals';

import redis from '../../redis';
import { createServer } from '../../server';
import { comparePassword } from './login';

describe('login', () => {
  beforeEach(async () => {
    for (const key of await redis.keys('*')) {
      if (key.includes('1122')) {
        await redis.del(key);
      }
    }
  });

  test('should failed on too many requests', async () => {
    const app = await createServer();

    const opt = {
      method: 'post',
      url: '/v0.5/login',
      payload: { email: 'ee', password: 'eepp', 'h-captcha-response': 'fake-response' },
      headers: {
        'cf-connecting-ip': '1122',
      },
    } as const;

    const login = () => app.inject(opt);

    const all = await Promise.all(Array.from({ length: 20 }).map(() => login()));

    const res = await login();

    expect(all.filter((x) => x.statusCode === 429)).not.toHaveLength(0);

    expect(res.statusCode).toBe(429);
    expect(res.json()).toMatchSnapshot();
  });
});

describe('compare password', () => {
  test('should pass', async () => {
    const hashed = '$2a$12$GA5Pr9GhsyLJcSPoTpYBY.JqTzYZb2nfgSeZ1EK38bfgk/Rykkvuq';
    const input = 'lovemeplease';
    await expect(comparePassword(hashed, input)).resolves.toBe(true);
  });

  test('should not pass', async () => {
    const hashed = '$2a$12$GA5Pr9GhsyLJcSPoTpYBY.JqTzYZb2nfgSeZ1EK38bfgk/Rykkvuq';
    const input = 'lovemeplease1';
    await expect(comparePassword(hashed, input)).resolves.toBe(false);
  });
});
