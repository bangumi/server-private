import { describe, expect, test } from 'vitest';

import { createTestServer } from '@app/tests/utils.ts';

import { setup } from './trending.ts';

describe('trending', () => {
  test('should get trending subjects', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/trending/subjects',
      query: { type: '2', limit: '5' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body.data)).toBe(true);
    for (const item of body.data) {
      expect(item).toMatchObject({
        subject: expect.objectContaining({ type: 2 }),
        count: expect.any(Number),
      });
    }
  });

  test('should get channel topics with type', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/trending/subjects/topics',
      query: { type: '2', limit: '10', offset: '0' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body.data)).toBe(true);
    expect(typeof body.total).toBe('number');
    for (const topic of body.data) {
      expect(topic).toMatchObject({
        id: expect.any(Number),
        title: expect.any(String),
        replyCount: expect.any(Number),
        updatedAt: expect.any(Number),
        subject: expect.objectContaining({ type: 2 }),
      });
      expect('replies' in topic).toBe(false);
    }
  });

  test('should get all topics without type', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/trending/subjects/topics',
      query: { limit: '10', offset: '0' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body.data)).toBe(true);
    expect(typeof body.total).toBe('number');
    for (const topic of body.data) {
      expect(topic).toMatchObject({
        id: expect.any(Number),
        title: expect.any(String),
        replyCount: expect.any(Number),
        updatedAt: expect.any(Number),
        subject: expect.any(Object),
      });
      expect('replies' in topic).toBe(false);
    }
  });

  test('should reject invalid subject type', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/trending/subjects/topics',
      query: { type: '5' },
    });
    expect(res.statusCode).toBe(400);
  });
});
