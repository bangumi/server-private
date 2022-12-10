import { afterEach, beforeEach, expect, test } from 'vitest';

import prisma from '../../lib/prisma';
import { createServer } from '../../lib/server';

const treeHoleUser = { id: 382951, nickname: '树洞酱', username: '382951' };
const fakeIP = 'fake-client-ip-should-not-fail';

beforeEach(async () => {
  await prisma.chii_os_web_sessions.deleteMany();
});

afterEach(async () => {
  await prisma.chii_os_web_sessions.deleteMany();
});

test('should pass login/logout authorization flow', async () => {
  const app = await createServer();

  const res = await app.inject({
    url: '/p1/login',
    method: 'post',
    payload: {
      email: 'treeholechan@gmail.com',
      password: 'lovemeplease',
      'h-captcha-response': 'fake-response',
    },
    headers: {
      'cf-connecting-ip': fakeIP,
    },
  });

  expect(res.json()).toMatchObject(treeHoleUser);
  expect(res.statusCode).toBe(200);

  const cookieValue = (res.cookies as { name: string; value: string }[]).find(
    (x) => x.name === 'sessionID',
  )?.value;

  expect(cookieValue).toBeDefined();

  if (!cookieValue) {
    throw new Error('no cookies return');
  }

  const currentRes = await app.inject({
    method: 'get',
    url: '/p1/me',
    cookies: { sessionID: cookieValue },
  });

  expect(currentRes.json()).toMatchObject(treeHoleUser);

  const logout = await app.inject({
    method: 'post',
    url: '/p1/logout',
    cookies: { sessionID: cookieValue },
  });

  expect(logout.statusCode).toBe(200);
  expect(logout.cookies).toContainEqual(
    expect.objectContaining({
      name: 'sessionID',
      value: '',
    }),
  );

  const currentUser2 = await app.inject({
    method: 'get',
    url: '/p1/me',
    cookies: { sessionID: cookieValue },
  });

  expect(currentUser2.statusCode).toBe(401);
});
