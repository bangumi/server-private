import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import prisma from '../../../prisma';
import redis from '../../../redis';
import { createServer } from '../../../server';
import { comparePassword } from './login';

describe('login', () => {
  beforeEach(async () => {
    await redis.flushdb('SYNC');
    await prisma.chii_os_web_sessions.deleteMany();
  });

  afterEach(async () => {
    await redis.flushdb('SYNC');
    await prisma.chii_os_web_sessions.deleteMany();
  });

  test('should failed on too many requests', async () => {
    const app = await createServer();

    const opt = {
      method: 'post',
      url: '/p1/login',
      payload: { email: 'ee', password: 'eepp', 'h-captcha-response': 'fake-response' },
    } as const;

    const login = () => app.inject(opt);

    const all = await Promise.all(Array.from({ length: 20 }).map(() => login()));

    const res = await login();

    expect(all.filter((x) => x.statusCode === 429)).not.toHaveLength(0);

    expect(res.statusCode).toBe(429);
    expect(res.json()).toMatchSnapshot();
  });

  test('should login', async () => {
    const app = await createServer();

    const res = await app.inject({
      method: 'post',
      url: '/p1/login',
      payload: {
        email: 'treeholechan@gmail.com',
        password: 'lovemeplease',
        'h-captcha-response': 'fake-response',
      },
    });

    expect(res.statusCode).toBe(200);
    // @ts-expect-error remove this ts-ignore after light-my-request release a new version
    expect(res.cookies.filter((x: { name: string }) => x.name === 'sessionID')).toHaveLength(1);
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
