import { describe, expect, test } from 'vitest';

import { createTestServer } from '@app/tests/utils.ts';
import { emptyAuth } from '@app/lib/auth/index.ts';

import { setup } from './collection.ts';

describe('episode collection', () => {
  test('should get episodes', async () => {
    const app = createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        userID: 382951,
      },
    });
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/collections/subjects/2703/episodes',
      query: { limit: '2', offset: '0' },
    });
    expect(res.json()).toMatchSnapshot();
  });

  test('should get single episode', async () => {
    const app = createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        userID: 382951,
      },
    });
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/collections/subjects/-/episodes/17227',
    });
    expect(res.json()).toMatchSnapshot();
  });
});
