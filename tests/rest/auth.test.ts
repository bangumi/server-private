import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';

import prisma from '../../lib/prisma';
import { createServer } from '../../lib/server';

const treeHoleUser = { ID: 382951, nickname: '树洞酱', username: '382951' };

describe('login auth flow', () => {
  beforeEach(async () => {
    await prisma.chii_os_web_sessions.deleteMany();
  });

  afterEach(async () => {
    await prisma.chii_os_web_sessions.deleteMany();
  });

  test('login', async () => {
    const app = await createServer();

    const res = await app.inject({
      url: '/v0.5/login',
      method: 'post',
      payload: { email: 'treeholechan@gmail.com', password: 'lovemeplease' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(treeHoleUser);

    const cookieValue = (res.cookies as { name: string; value: string }[]).find(
      (x) => x.name === 'sessionID',
    )?.value;

    expect(cookieValue).toBeDefined();

    const currentRes = await app.inject({
      method: 'get',
      url: '/v0.5/me',
      cookies: { sessionID: cookieValue! },
    });

    expect(currentRes.json()).toEqual({ data: treeHoleUser });
  });
});
