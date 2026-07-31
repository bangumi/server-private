import { expect, test } from 'vitest';

import { setup } from '@app/routes/private/routes/wiki/index.ts';
import { createTestServer } from '@app/tests/utils.ts';

test('test recent change list', async () => {
  const app = createTestServer();
  await app.register(setup);

  const res = await app.inject('/recent/subjects');

  expect(res.statusCode).toBe(200);
});

test.each([
  ['/recent/subjects', { subject: [], persons: [] }],
  ['/recent/persons', []],
  ['/recent/characters', []],
  ['/recent/episodes', []],
])('filters recent change list by since query for %s', async (url, expected) => {
  const app = createTestServer();
  await app.register(setup);

  const res = await app.inject({
    url,
    query: { since: String(Math.ceil(Date.now() / 1000) + 3600) },
  });

  expect(res.statusCode).toBe(200);
  expect(res.json()).toEqual(expected);
});
