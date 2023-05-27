import { afterEach, beforeEach, expect, test } from 'vitest';

import * as session from '@app/lib/auth/session.ts';
import { SessionRepo } from '@app/lib/orm/index.ts';
import { createServer } from '@app/lib/server.ts';

const treeHoleUser = { id: 382951, nickname: '树洞酱', username: '382951' };
const fakeIP = 'fake-client-ip-should-not-fail';

beforeEach(async () => {
  await SessionRepo.createQueryBuilder().where('true').delete().execute();
});

afterEach(async () => {
  await SessionRepo.createQueryBuilder().where('true').delete().execute();
});

test('should pass login/logout authorization flow', async () => {
  const app = await createServer();

  const res = await app.inject({
    url: '/p1/login',
    method: 'post',
    payload: {
      email: 'treeholechan@gmail.com',
      password: 'lovemeplease',
      'cf-turnstile-response': 'fake-response',
    },
    headers: {
      'cf-connecting-ip': fakeIP,
    },
  });

  expect(res.json()).toMatchObject(treeHoleUser);
  expect(res.statusCode).toBe(200);

  const cookieValue = (res.cookies as { name: string; value: string }[]).find(
    (x) => x.name === session.CookieKey,
  )?.value;

  expect(cookieValue).toBeDefined();

  if (!cookieValue) {
    throw new Error('no cookies return');
  }

  const currentRes = await app.inject({
    method: 'get',
    url: '/p1/me',
    cookies: { [session.CookieKey]: cookieValue },
  });

  expect(currentRes.json()).toMatchObject(treeHoleUser);

  const logout = await app.inject({
    method: 'post',
    url: '/p1/logout',
    payload: {},
    cookies: { [session.CookieKey]: cookieValue },
  });

  expect(logout.statusCode).toBe(200);
  expect(logout.cookies).toContainEqual(
    expect.objectContaining({
      name: session.CookieKey,
      value: '',
    }),
  );

  const currentUser2 = await app.inject({
    method: 'get',
    url: '/p1/me',
    cookies: { [session.CookieKey]: cookieValue },
  });

  expect(currentUser2.statusCode).toBe(401);
});
