import { setTimeout } from 'node:timers/promises';

import { expect, test } from '@jest/globals';

import { createServer } from '../../server';

test('should failed on too many requests', async () => {
  await setTimeout(1000);
  const app = await createServer();
  await Promise.all(
    Array.from({ length: 30 }).map(() =>
      app.inject({
        method: 'post',
        url: '/v0.5/login',
        payload: { email: 'ee', password: 'eepp' },
      }),
    ),
  );

  const res = await app.inject({
    method: 'post',
    url: '/v0.5/login',
    payload: { email: 'ee', password: 'eepp' },
  });

  expect(res.statusCode).toBe(429);
  expect(res.json()).toMatchSnapshot();

  await setTimeout(1000);
});
