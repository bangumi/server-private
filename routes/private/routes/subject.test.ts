import { beforeEach, describe, expect, test, vi } from 'vitest';

import { emptyAuth } from '@app/lib/auth/index.ts';
import { createTestServer } from '@app/tests/utils.ts';

import { setup } from './subject.ts';

describe('subject', () => {
  test('should get subject', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/subjects/12',
    });
    expect(res.json()).toMatchSnapshot();
  });

  test('should get subject relations', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/subjects/12/relations',
      query: { limit: '2', offset: '0' },
    });
    expect(res.json()).toMatchSnapshot();
  });
});
