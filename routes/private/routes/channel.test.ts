import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { db, op, schema } from '@app/drizzle';
import { redisPrefix } from '@app/lib/config.ts';
import redis from '@app/lib/redis.ts';
import { createTestServer } from '@app/tests/utils.ts';

import { setup } from './channel.ts';

describe('channel', () => {
  const testTopicID = 12345671;
  const testSubjectID = 12; // 动画
  const testUserID = 287622;

  beforeEach(async () => {
    await db.insert(schema.chiiSubjectTopics).values({
      id: testTopicID,
      subjectID: testSubjectID,
      createdAt: 1462335911,
      updatedAt: 1462335911,
      uid: testUserID,
      title: 'Test Topic',
      state: 0,
      replies: 1,
      display: 1,
    });
  });

  afterEach(async () => {
    await db
      .delete(schema.chiiSubjectTopics)
      .where(op.eq(schema.chiiSubjectTopics.id, testTopicID));
  });

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

  test('should get channel tags from pre-aggregated tag index', async () => {
    const ids = [12345681, 12345682, 12345683, 12345684];
    const now = 1;
    await db.insert(schema.chiiTagIndex).values([
      // type=2 的条目标签
      {
        id: ids[0],
        name: 'channel-tag-a',
        cat: 0,
        type: 2,
        count: 5,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: ids[1],
        name: 'channel-tag-b',
        cat: 0,
        type: 2,
        count: 10,
        createdAt: now,
        updatedAt: now,
      },
      // 其他 cat/type 的标签不应出现
      {
        id: ids[2],
        name: 'channel-tag-other-cat',
        cat: 1,
        type: 2,
        count: 99,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: ids[3],
        name: 'channel-tag-other-type',
        cat: 0,
        type: 1,
        count: 99,
        createdAt: now,
        updatedAt: now,
      },
    ]);
    const cacheKey = `${redisPrefix}:channel-tags:2:50:0`;
    await redis.del(cacheKey);
    try {
      const app = createTestServer();
      await app.register(setup);
      const res = await app.inject({
        method: 'get',
        url: '/channels/2/tags',
        query: { limit: '50', offset: '0' },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.total).toBe(2);
      expect(body.data).toEqual([
        { name: 'channel-tag-b', count: 10 },
        { name: 'channel-tag-a', count: 5 },
      ]);
    } finally {
      await db.delete(schema.chiiTagIndex).where(op.inArray(schema.chiiTagIndex.id, ids));
      await redis.del(cacheKey);
    }
  });

  test('should get channel topics', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/channels/2/topics',
      query: { limit: '10', offset: '0' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body.data)).toBe(true);
    expect(typeof body.total).toBe('number');
    const topic = body.data.find((t: { id: number }) => t.id === testTopicID);
    expect(topic).toMatchObject({
      id: testTopicID,
      title: 'Test Topic',
      replyCount: 1,
      updatedAt: expect.any(Number),
      subject: expect.objectContaining({ id: testSubjectID, type: 2 }),
    });
  });

  test('should reject invalid channel type for topics', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/channels/5/topics',
    });
    expect(res.statusCode).toBe(400);
  });
});
