import { describe, expect, test } from 'vitest';

import { createTestServer } from '@app/tests/utils.ts';

import { setup } from './channel.ts';

describe('channel', () => {
  test('should get channel blogs', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/channels/2/blogs',
      query: { limit: '6', offset: '0' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body.data)).toBe(true);
    expect(typeof body.total).toBe('number');
    for (const entry of body.data) {
      expect(entry).toMatchObject({
        id: expect.any(Number),
        title: expect.any(String),
        summary: expect.any(String),
        replies: expect.any(Number),
        createdAt: expect.any(Number),
        updatedAt: expect.any(Number),
        public: true,
      });
    }
  });

  test('should reject invalid channel type', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/channels/5/blogs',
    });
    expect(res.statusCode).toBe(400);
  });

  test('should get channel tags', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/channels/2/tags',
      query: { limit: '50', offset: '0' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body.data)).toBe(true);
    expect(typeof body.total).toBe('number');
    const names = new Set<string>();
    let previous = Infinity;
    for (const tag of body.data) {
      expect(tag).toMatchObject({
        name: expect.any(String),
        count: expect.any(Number),
      });
      expect(names.has(tag.name)).toBe(false);
      names.add(tag.name);
      expect(tag.count).toBeLessThanOrEqual(previous);
      previous = tag.count;
    }
  });

  test('should reject invalid channel type for tags', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/channels/0/tags',
    });
    expect(res.statusCode).toBe(400);
  });
});
