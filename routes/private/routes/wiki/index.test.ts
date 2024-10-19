import { expect, test } from 'vitest';

import { setup } from '@app/routes/private/routes/wiki/index.ts';
import { createTestServer } from '@app/tests/utils.ts';

test('test recent change list', async () => {
  const app = await createTestServer();
  await app.register(setup);

  const res = await app.inject('/recent');

  expect(res.statusCode).toBe(200);
});
