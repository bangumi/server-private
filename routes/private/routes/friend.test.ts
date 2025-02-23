import { describe, expect, test } from 'vitest';

import { createTestServer } from '@app/tests/utils.ts';
import { emptyAuth } from '@app/lib/auth/index.ts';

import { setup } from './friend.ts';

describe('get', () => {
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
      url: '/friends',
      query: { limit: '2', offset: '0' },
    });
    expect(res.json()).toMatchSnapshot();
  });

  test('should get followers', async () => {
    const app = createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        userID: 427613,
      },
    });
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/followers',
      query: { limit: '2', offset: '0' },
    });
    expect(res.json()).toMatchSnapshot();
  });
});
