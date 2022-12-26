import { expect, test } from 'vitest';

import { createServer } from 'app/lib/server';

const app = await createServer();

test('should get user', async () => {
  const res = await app.inject({ url: '/v0.5/users/382951' });
  expect(res.json()).toMatchSnapshot();
  expect(res.statusCode).toBe(200);
});

test('should get user', async () => {
  const res = await app.inject({ url: '/v0.5/users/non-existing-user' });
  expect(res.json()).toMatchSnapshot();
  expect(res.statusCode).toBe(404);
});
