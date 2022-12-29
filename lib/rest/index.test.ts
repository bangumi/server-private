import { expect, test } from 'vitest';

import { createServer } from '@app/lib/server';

test('should build openapi spec', async () => {
  const app = await createServer();

  const res = await app.inject({ url: '/v0.5/openapi.json' });
  expect(res.statusCode).toBe(200);
  expect(res.json()).toMatchObject({ info: { title: 'hello' } });
});

test('should build private api spec', async () => {
  const app = await createServer();

  const res = await app.inject({ url: '/p1/openapi.json' });
  expect(res.statusCode).toBe(200);
  expect(res.json()).toMatchObject({ info: { title: 'hello' } });
});
