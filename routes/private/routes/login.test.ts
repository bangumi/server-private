import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { SessionRepo } from '@app/lib/orm';
import redis from '@app/lib/redis';
import { createServer } from '@app/lib/server';

describe('login', () => {
  beforeEach(async () => {
    await redis.flushdb('SYNC');
    await SessionRepo.createQueryBuilder().where('true').delete().execute();
  });

  afterEach(async () => {
    await redis.flushdb('SYNC');
    await SessionRepo.createQueryBuilder().where('true').delete().execute();
  });

  test('should failed on too many requests', async () => {
    const app = await createServer();

    const opt = {
      method: 'post',
      url: '/p1/login2',
      payload: { email: 'ee', password: 'eepp', 'cf-turnstile-response': 'fake-response' },
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
      url: '/p1/login2',
      payload: {
        email: 'treeholechan@gmail.com',
        password: 'lovemeplease',
        'cf-turnstile-response': 'fake-response',
      },
    });

    expect(res.statusCode).toBe(200);
    expect(
      // @ts-expect-error remove this ts-ignore after light-my-re quest release a new version
      res.cookies.filter((x: { name: string }) => x.name === 'chiiNextSessionID'),
    ).toHaveLength(1);
    expect(res.json()).toMatchSnapshot();
  });
});
