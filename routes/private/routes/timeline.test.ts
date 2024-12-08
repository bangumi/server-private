import { describe, expect, test } from 'vitest';

import { createTestServer } from '@app/tests/utils.ts';
import { emptyAuth } from '@app/lib/auth/index.ts';

import { setup } from './timeline.ts';

describe('timeline', () => {
  test('should get all', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/timeline',
      query: { offset: '0' },
    });
    expect(res.json()).toMatchSnapshot();
  });

  test('should get friends', async () => {
    const app = createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        userID: 287622,
      },
    });

    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/timeline',
      query: { mode: 'friends', offset: '0' },
    });
    expect(res.json()).toMatchSnapshot();
  });
});
