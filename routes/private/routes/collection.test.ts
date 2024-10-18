import { describe, expect, test } from 'vitest';

import { createTestServer } from '@app/tests/utils.ts';

import { setup } from './collection.ts';

describe('user collection', () => {
  test('should get summary', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/users/382951/collections/summary',
    });
    expect(res.json()).toMatchSnapshot();
  });

  test('should get subjects', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/users/382951/collections/subjects',
      query: { subjectType: '2', type: '2', limit: '1', offset: '0' },
    });
    expect(res.json()).toMatchSnapshot();
  });

  test('should get characters', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/users/1/collections/characters',
      query: { limit: '1', offset: '0' },
    });
    expect(res.json()).toMatchSnapshot();
  });

  test('should get persons', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/users/1/collections/persons',
      query: { limit: '1', offset: '0' },
    });
    expect(res.json()).toMatchSnapshot();
  });

  test('should get indexes', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/users/1/collections/indexes',
      query: { limit: '1', offset: '0' },
    });
    expect(res.json()).toMatchSnapshot();
  });

  test('should get created indexes', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/users/14127/indexes',
      query: { limit: '1', offset: '0' },
    });
    expect(res.json()).toMatchSnapshot();
  });
});
