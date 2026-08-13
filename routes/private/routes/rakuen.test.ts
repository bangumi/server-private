import { describe, expect, test } from 'vitest';

import { createTestServer } from '@app/tests/utils.ts';

import { setup } from './rakuen.ts';

const topicTypes = ['group', 'subject', 'episode', 'character', 'person'];

describe('rakuen', () => {
  test('should get all topics, sorted by updatedAt desc', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/rakuen/topics',
      query: { limit: '20' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body.data)).toBe(true);
    expect(typeof body.total).toBe('number');
    const updatedAts = body.data.map((x: { updatedAt: number }) => x.updatedAt);
    expect([...updatedAts].toSorted((a, b) => b - a)).toEqual(updatedAts);
    for (const item of body.data) {
      expect(topicTypes).toContain(item.type);
      expect(item.updatedAt).toEqual(expect.any(Number));
    }
  });

  test('should get group topics', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/rakuen/topics',
      query: { type: 'group', limit: '10' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(typeof body.total).toBe('number');
    for (const item of body.data) {
      expect(item).toMatchObject({
        type: 'group',
        id: expect.any(Number),
        title: expect.any(String),
        replyCount: expect.any(Number),
        creator: expect.objectContaining({ id: expect.any(Number) }),
        group: expect.objectContaining({ id: expect.any(Number) }),
        updatedAt: expect.any(Number),
      });
    }
  });

  test('should get subject topics', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/rakuen/topics',
      query: { type: 'subject', limit: '10' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(typeof body.total).toBe('number');
    for (const item of body.data) {
      expect(item).toMatchObject({
        type: 'subject',
        id: expect.any(Number),
        title: expect.any(String),
        replyCount: expect.any(Number),
        creator: expect.objectContaining({ id: expect.any(Number) }),
        subject: expect.objectContaining({ id: expect.any(Number) }),
        updatedAt: expect.any(Number),
      });
    }
  });

  test('should get episodes', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/rakuen/topics',
      query: { type: 'episode', limit: '10' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(typeof body.total).toBe('number');
    for (const item of body.data) {
      expect(item).toMatchObject({
        type: 'episode',
        id: expect.any(Number),
        subject: expect.objectContaining({ id: expect.any(Number) }),
        episode: {
          id: expect.any(Number),
          sort: expect.any(Number),
          type: expect.any(Number),
          name: expect.any(String),
          nameCN: expect.any(String),
          comment: expect.any(Number),
        },
        updatedAt: expect.any(Number),
      });
    }
  });

  test('should get characters', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/rakuen/topics',
      query: { type: 'character', limit: '10' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(typeof body.total).toBe('number');
    for (const item of body.data) {
      expect(item).toMatchObject({
        type: 'character',
        id: expect.any(Number),
        name: expect.any(String),
        comment: expect.any(Number),
        updatedAt: expect.any(Number),
      });
    }
  });

  test('should get persons', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/rakuen/topics',
      query: { type: 'person', limit: '10' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(typeof body.total).toBe('number');
    for (const item of body.data) {
      expect(item).toMatchObject({
        type: 'person',
        id: expect.any(Number),
        name: expect.any(String),
        comment: expect.any(Number),
        updatedAt: expect.any(Number),
      });
    }
  });

  test('my_group without login returns empty data', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/rakuen/topics',
      query: { type: 'my_group' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ data: [], total: 0 });
  });

  test('my_group with login returns joined group topics', async () => {
    const app = createTestServer({ auth: { userID: 382951, login: true } });
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/rakuen/topics',
      query: { type: 'my_group', limit: '10' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(typeof body.total).toBe('number');
    for (const item of body.data) {
      expect(item.type).toBe('group');
      expect(item.group.id).toBe(4215);
    }
  });

  test('should reject invalid type', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/rakuen/topics',
      query: { type: 'invalid' },
    });
    expect(res.statusCode).toBe(400);
  });

  test('should reject limit above 200', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/rakuen/topics',
      query: { limit: '201' },
    });
    expect(res.statusCode).toBe(400);
  });
});
