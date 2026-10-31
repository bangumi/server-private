import { expect, test } from 'vitest';

import { setup } from '@app/routes/private/routes/wiki/index.ts';
import { createTestServer } from '@app/tests/utils.ts';

// 各用例共享 server 实例，避免每条用例重新 createTestServer 而重复编译 response schema serializer
const app = createTestServer();
await app.register(setup);

test('test recent change list', async () => {
  const res = await app.inject('/recent/subjects');

  expect(res.statusCode).toBe(200);
});

test.each([
  ['/recent/subjects', []],
  ['/recent/persons', []],
  ['/recent/characters', []],
  ['/recent/episodes', []],
])('filters recent change list by since query for %s', async (url, expected) => {
  const res = await app.inject({
    url,
    query: { since: String(Math.ceil(Date.now() / 1000) + 3600) },
  });

  expect(res.statusCode).toBe(200);
  expect(res.json()).toEqual(expected);
});
