import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { emptyAuth } from '@app/lib/auth/index.ts';
import { db, op } from '@app/drizzle/db.ts';
import * as schema from '@app/drizzle/schema.ts';
import redis from '@app/lib/redis.ts';
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

describe('person comments', () => {
  beforeEach(async () => {
    await redis.flushdb();
    await db.delete(schema.chiiPrsnComments).where(op.eq(schema.chiiPrsnComments.mid, 1));
    await db.insert(schema.chiiPrsnComments).values({
      id: 12345670,
      mid: 1,
      content: '7月7日 77结婚',
      state: 0,
      createdAt: 1400517144,
      uid: 287622,
      related: 0,
    });
    await db.insert(schema.chiiPrsnComments).values({
      id: 12345671,
      mid: 1,
      content: '是6号结的',
      state: 0,
      createdAt: 1400517144,
      uid: 287622,
      related: 12345670,
    });
    await db.insert(schema.chiiPrsnComments).values({
      id: 12345672,
      mid: 1,
      content: '生日快乐！',
      state: 0,
      createdAt: 1400517144,
      uid: 287622,
      related: 0,
    });
  });

  afterEach(async () => {
    await redis.flushdb();
    await db.delete(schema.chiiPrsnComments).where(op.eq(schema.chiiPrsnComments.mid, 1));
  });

  test('should get person comments', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/persons/1/comments',
    });
    expect(res.json()).toMatchSnapshot();
  });

  test('should create person comment', async () => {
    const app = createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        userID: 287622,
      },
    });
    await app.register(setup);
    const res = await app.inject({
      method: 'post',
      url: '/persons/1/comments',
      payload: { content: '恭喜恭喜', turnstileToken: 'fake-response' },
    });
    expect(res.statusCode).toBe(200);
    const pstID: number = res.json().id;
    const [pst] = await db
      .select()
      .from(schema.chiiPrsnComments)
      .where(op.eq(schema.chiiPrsnComments.id, pstID));
    expect(pst?.content).toBe('恭喜恭喜');
  });

  test('should not allow create person comment', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'post',
      url: '/persons/1/comments',
      payload: { content: '恭喜恭喜', turnstileToken: 'fake-response' },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchSnapshot();
  });
});
