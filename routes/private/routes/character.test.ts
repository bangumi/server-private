import { describe, expect, test } from 'vitest';

import { createTestServer } from '@app/tests/utils.ts';

import { setup } from './character.ts';
import { emptyAuth } from '@app/lib/auth/index.ts';

describe('character', () => {
  test('should get character', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/characters/32',
    });
    expect(res.json()).toMatchSnapshot();
  });

  test('should get character with collectedAt', async () => {
    const app = createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        userID: 6162,
      },
    });
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/characters/32',
    });
    expect(res.json()).toMatchSnapshot();
  });

  test('should get character casts', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/characters/32/casts',
      query: { limit: '2', offset: '0' },
    });
    expect(res.json()).toMatchSnapshot();
  });

  test('should get character collects', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/characters/32/collects',
      query: { limit: '2', offset: '0' },
    });
    expect(res.json()).toMatchSnapshot();
  });
});
