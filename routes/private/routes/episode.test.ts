import { beforeEach, describe, expect, test, vi } from 'vitest';

import { db, op } from '@app/drizzle/db.ts';
import * as schema from '@app/drizzle/schema';
import { emptyAuth } from '@app/lib/auth/index.ts';
import { createTestServer } from '@app/tests/utils.ts';

import { setup } from './episode.ts';

beforeEach(async () => {
  await db.delete(schema.chiiEpComments).where(op.eq(schema.chiiEpComments.mid, 1027));
  await db.insert(schema.chiiEpComments).values({
    id: 205402,
    mid: 1027,
    content: '設計師太紳士了(bgm38)',
    state: 0,
    createdAt: 1400517144,
    uid: 382951,
    related: 0,
  });
  await db.insert(schema.chiiEpComments).values({
    id: 242518,
    mid: 1027,
    content: '结果现在再没有类似设定的了(?)。',
    state: 0,
    createdAt: 1413713418,
    uid: 382951,
    related: 205402,
  });
  await db.insert(schema.chiiEpComments).values({
    id: 215256,
    mid: 1027,
    content: 'op神曲~',
    state: 0,
    createdAt: 1404574453,
    uid: 382951,
    related: 0,
  });
});

describe('get episode', () => {
  test('should get episode', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/subjects/-/episode/1027',
    });
    expect(res.json()).toMatchSnapshot();
  });
});

describe('get ep comment', () => {
  test('should get ep comment', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/subjects/-/episode/1027/comments',
    });
    expect(res.json()).toMatchSnapshot();
  });
});

describe('create ep comment', () => {
  test('should create ep comment', async () => {
    const app = createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        userID: 382951,
      },
    });
    await app.register(setup);

    const res = await app.inject({
      url: '/subjects/-/episode/1027/comments',
      method: 'post',
      payload: { content: '114514', 'cf-turnstile-response': 'fake-response' },
    });
    expect(res.statusCode).toBe(200);
    const pstID: number = res.json().id;
    const [pst] = await db
      .select()
      .from(schema.chiiEpComments)
      .where(op.eq(schema.chiiEpComments.id, pstID));
    expect(pst?.content).toBe('114514');
  });

  test('should now allowd create ep comment', async () => {
    const app = createTestServer();
    await app.register(setup);

    const res = await app.inject({
      url: '/subjects/-/episode/1027/comments',
      method: 'post',
      payload: { content: '114514', 'cf-turnstile-response': 'fake-response' },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchSnapshot();
  });
});

describe('edit ep comment', () => {
  test('should edit ep comment', async () => {
    const app = createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        userID: 382951,
      },
    });
    await app.register(setup);

    const res = await app.inject({
      url: `/subjects/-/episode/-/comments/215256`,
      method: 'put',
      payload: { content: 'new comment' },
    });
    expect(res.statusCode).toBe(200);

    const [data] = await db
      .select()
      .from(schema.chiiEpComments)
      .where(op.eq(schema.chiiEpComments.id, 215256));
    expect(data?.content).toBe('new comment');
  });

  test('should not edit ep comment not owned', async () => {
    const app = createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        userID: 382951 + 1,
      },
    });
    await app.register(setup);

    const res = await app.inject({
      url: `/subjects/-/episode/-/comments/205402`,
      method: 'put',
      payload: { content: 'new comment again' },
    });

    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchSnapshot();
  });

  test('should not edit ep comment with replies', async () => {
    const app = createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        userID: 382951,
      },
    });
    await app.register(setup);

    const res = await app.inject({
      url: `/subjects/-/episode/-/comments/205402`,
      method: 'put',
      payload: { content: 'new comment again' },
    });

    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchSnapshot();
  });
});

describe('delete ep comment', () => {
  test('not allowed not login', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      url: '/subjects/-/episode/-/comments/114514',
      method: 'delete',
    });

    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchSnapshot();
  });

  test('not allowed wrong user', async () => {
    const app = createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        userID: 1122,
      },
    });
    await app.register(setup);
    const res = await app.inject({
      url: '/subjects/-/episode/-/comments/205402',
      method: 'delete',
    });

    expect(res.json()).toMatchSnapshot();
    expect(res.statusCode).toBe(401);
  });

  test('ok', async () => {
    const app = createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        userID: 382951,
      },
    });
    await app.register(setup);

    const res = await app.inject({
      method: 'delete',
      url: '/subjects/-/episode/-/comments/205402',
    });
    expect(res.json()).toMatchSnapshot();
    expect(res.statusCode).toBe(200);
    const [pst] = await db
      .select()
      .from(schema.chiiEpComments)
      .where(op.eq(schema.chiiEpComments.id, 205402));
    expect(pst?.state).toBe(6);
  });
});
