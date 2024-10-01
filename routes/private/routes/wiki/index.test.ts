import { expect, test } from 'vitest';

import { createServer } from '@app/lib/server.ts';
import { setup } from '@app/routes/private/routes/wiki/index.ts';

test('test recent change list', async () => {
  const app = await createServer();
  await app.register(setup);

  const res = await app.inject('/recent');

  expect(res.statusCode).toBe(200);
});
