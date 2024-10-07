import { describe, expect, test } from 'vitest';

import { createTestServer } from '@app/tests/utils.ts';

import { setup } from './collection.ts';

describe('user collection', () => {
  test('should summary', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/users/382951/collections/summary',
    });
    expect(res.json()).toMatchSnapshot();
  });
});
