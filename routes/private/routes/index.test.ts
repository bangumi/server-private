import { describe, expect, test } from 'vitest';

import { createTestServer } from '@app/tests/utils.ts';

import { setup } from './index.ts';

describe('get index', () => {
  test('should get index', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/indexes/15045',
    });
    expect(res.json()).toMatchSnapshot();
  });

  test('should get index related', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/indexes/15045/related',
    });
    expect(res.json()).toMatchSnapshot();
  });
});
