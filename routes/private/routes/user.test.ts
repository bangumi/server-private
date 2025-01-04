import { describe, expect, test } from 'vitest';

import { createTestServer } from '@app/tests/utils.ts';
import { emptyAuth } from '@app/lib/auth/index.ts';

import { setup } from './user.ts';

describe('user', () => {
  test('should get user', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/users/382951',
    });
    expect(res.json()).toMatchSnapshot();
  });
});

describe('user relations', () => {
  test('should get friends', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/users/287622/friends',
      query: { limit: '1', offset: '0' },
    });
    expect(res.json()).toMatchSnapshot();
  });

  test('should get followers', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/users/287622/followers',
      query: { limit: '1', offset: '0' },
    });
    expect(res.json()).toMatchSnapshot();
  });
});

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

  test('should get single subject', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/users/382951/collections/subjects/8',
    });
    expect(res.json()).toMatchSnapshot();
  });

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
      url: '/users/-/collections/subjects/2703/episodes',
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
      url: '/users/-/collections/subjects/-/episodes/17227',
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

  test('should get single character', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/users/1/collections/characters/32',
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

  test('should get single person', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/users/1/collections/persons/1',
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

  test('should get single index', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/users/1/collections/indexes/1',
    });
    expect(res.json()).toMatchSnapshot();
  });

  test('should get groups', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/users/287622/groups',
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

  test('should get blogs', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/users/287622/blogs',
      query: { limit: '1', offset: '0' },
    });
    expect(res.json()).toMatchSnapshot();
  });

  test('should get timeline', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/users/287622/timeline',
    });
    expect(res.json()).toMatchSnapshot();
  });
});
