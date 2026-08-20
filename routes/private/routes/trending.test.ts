import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { db, op, schema } from '@app/drizzle';
import redis from '@app/lib/redis.ts';
import { getTrendingSubjectTopicKey } from '@app/lib/trending/cache.ts';
import { type TrendingItem, TrendingPeriod } from '@app/lib/trending/type';
import { createTestServer } from '@app/tests/utils.ts';

import { setup } from './trending.ts';

describe('trending', () => {
  const testTopicID = 12345670;
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
    await redis.del(getTrendingSubjectTopicKey(TrendingPeriod.Week));
  });

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

  test('should get trending subject topics from cache', async () => {
    const items: TrendingItem[] = [{ id: testTopicID, total: 1 }];
    await redis.set(getTrendingSubjectTopicKey(TrendingPeriod.Week), JSON.stringify(items));

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
    expect(body.total).toBe(1);
    const topic = body.data[0];
    expect(topic).toMatchObject({
      id: testTopicID,
      title: 'Test Topic',
      replyCount: 1,
      creatorID: testUserID,
      parentID: testSubjectID,
      subject: expect.objectContaining({ id: testSubjectID, type: 2 }),
      creator: expect.objectContaining({ id: testUserID }),
    });
    expect(Array.isArray(topic.replies)).toBe(true);
  });

  test('should return empty list when cache is missing', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/trending/subjects/topics',
      query: { limit: '10', offset: '0' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ data: [], total: 0 });
  });
});
