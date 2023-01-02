import { test, expect } from 'vitest';

import { emptyAuth } from '@app/lib/auth';
import { createTestServer } from '@app/tests/utils';

import { setup } from './post';

test('should edit post', async () => {
  const app = createTestServer({
    auth: {
      ...emptyAuth(),
      login: true,
      userID: 287622,
    },
  });

  await app.register(setup);

  const res = await app.inject({
    url: '/groups/-/posts/2177419',
    method: 'put',
    payload: { text: 'new content' },
  });

  expect(res.statusCode).toBe(204);
});
