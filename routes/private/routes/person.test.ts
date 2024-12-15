import { describe, expect, test } from 'vitest';

import { createTestServer } from '@app/tests/utils.ts';

import { setup } from './person.ts';

describe('person', () => {
  test('should get person', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/persons/1',
    });
    expect(res.json()).toMatchSnapshot();
  });

  test('should get person works', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/persons/1/works',
      query: { limit: '2', offset: '0' },
    });
    expect(res.json()).toMatchSnapshot();
  });

  test('should get person casts', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/persons/1/casts',
      query: { limit: '2', offset: '0' },
    });
    expect(res.json()).toMatchSnapshot();
  });

  test('should get person collects', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/persons/1/collects',
      query: { limit: '2', offset: '0' },
    });
    expect(res.json()).toMatchSnapshot();
  });
});
