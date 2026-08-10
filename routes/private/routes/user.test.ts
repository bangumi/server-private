import { describe, expect, test } from 'vitest';

import { emptyAuth } from '@app/lib/auth/index.ts';
import redis from '@app/lib/redis.ts';
import { getRelationCacheKey } from '@app/lib/user/cache.ts';
import { createTestServer } from '@app/tests/utils.ts';

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

  test('should include the authenticated user friendship', async () => {
    const viewerID = 900_101;
    const targetID = 382_951;
    const relationCacheKey = getRelationCacheKey(viewerID, targetID);
    await redis.set(relationCacheKey, '1');

    const app = createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        userID: viewerID,
      },
    });
    await app.register(setup);

    try {
      const res = await app.inject({
        method: 'get',
        url: `/users/${targetID}`,
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({ id: targetID, isFriend: true });
    } finally {
      await redis.del(relationCacheKey);
      await app.close();
    }
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
