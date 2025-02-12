import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { createTestServer } from '@app/tests/utils.ts';

import { setup } from './person.ts';
import { db, op } from '@app/drizzle/db.ts';
import * as schema from '@app/drizzle/schema.ts';
import { emptyAuth } from '@app/lib/auth/index.ts';

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
    await db.delete(schema.chiiPrsnComments).where(op.eq(schema.chiiPrsnComments.mid, 3862));
    await db.insert(schema.chiiPrsnComments).values({
      id: 205402,
      mid: 3862,
      content: '这肖像图……我喷了',
      state: 0,
      createdAt: 1400517144,
      uid: 382951,
      related: 0,
    });
    await db.insert(schema.chiiPrsnComments).values({
      id: 205403,
      mid: 3862,
      content: '+1',
      state: 0,
      createdAt: 1400517144,
      uid: 382951,
      related: 205402,
    });
    await db.insert(schema.chiiPrsnComments).values({
      id: 205404,
      mid: 3862,
      content: '这头像，带就不？',
      state: 0,
      createdAt: 1400517144,
      uid: 382951,
      related: 0,
    });
  });

  afterEach(async () => {
    await db.delete(schema.chiiPrsnComments).where(op.eq(schema.chiiPrsnComments.mid, 3862));
  });

  test('should get person comments', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/persons/3862/comments',
    });
    expect(res.json()).toMatchSnapshot();
  });

  test('should create person comment', async () => {
    const app = createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        userID: 382951,
      },
    });
    await app.register(setup);
    const res = await app.inject({
      method: 'post',
      url: '/persons/3862/comments',
      payload: { content: '这照片碉堡了', turnstileToken: 'fake-response' },
    });
    expect(res.statusCode).toBe(200);
    const pstID: number = res.json().id;
    const [pst] = await db
      .select()
      .from(schema.chiiPrsnComments)
      .where(op.eq(schema.chiiPrsnComments.id, pstID));
    expect(pst?.content).toBe('这照片碉堡了');
  });

  test('should not allow create person comment', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'post',
      url: '/persons/3862/comments',
      payload: { content: '这照片碉堡了', turnstileToken: 'fake-response' },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchSnapshot();
  });
});
