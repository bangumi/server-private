import { expect, test } from 'vitest';

import { createTestServer } from '../../../../tests/utils';
import { emptyAuth } from '../../../auth';
import { setup } from './user';

test('should list notify', async () => {
  const app = await createTestServer({
    auth: {
      ...emptyAuth(),
      login: true,
      userID: 287622,
    },
  });

  await app.register(setup);

  const res = await app.inject({ url: '/notify' });

  expect(res.statusCode).toBe(200);

  expect(Object.keys(res.json())).toContain('data');
});
