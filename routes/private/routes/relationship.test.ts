import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { db, op, schema } from '@app/drizzle';
import { emptyAuth } from '@app/lib/auth/index.ts';
import redis from '@app/lib/redis.ts';
import { createTestServer } from '@app/tests/utils.ts';

import { setup } from './relationship.ts';

describe('get', () => {
  test('should get friends', async () => {
    const app = createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        userID: 287622,
      },
    });
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/friends',
      query: { limit: '2', offset: '0' },
    });
    expect(res.json()).toMatchSnapshot();
  });

  test('should get followers', async () => {
    const app = createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        userID: 427613,
      },
    });
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/followers',
      query: { limit: '2', offset: '0' },
    });
    expect(res.json()).toMatchSnapshot();
  });
});

describe('friends', () => {
  beforeEach(async () => {
    await redis.flushdb();
    await db.delete(schema.chiiFriends).where(op.eq(schema.chiiFriends.uid, 1));
  });

  afterEach(async () => {
    await redis.flushdb();
    await db.delete(schema.chiiFriends).where(op.eq(schema.chiiFriends.uid, 1));
  });

  test('should add friend and remove friend', async () => {
    const app = createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        userID: 1,
      },
    });
    await app.register(setup);

    const res = await app.inject({
      method: 'put',
      url: '/friends/287622',
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({});

    const [friend] = await db
      .select()
      .from(schema.chiiFriends)
      .where(op.and(op.eq(schema.chiiFriends.uid, 1), op.eq(schema.chiiFriends.fid, 287622)));
    expect(friend).toBeDefined();

    const res2 = await app.inject({
      method: 'delete',
      url: '/friends/287622',
    });
    expect(res2.statusCode).toBe(200);
    expect(res2.json()).toEqual({});

    const [friend2] = await db
      .select()
      .from(schema.chiiFriends)
      .where(op.and(op.eq(schema.chiiFriends.uid, 1), op.eq(schema.chiiFriends.fid, 287622)));
    expect(friend2).toBeUndefined();
  });
});

describe('blocklist', () => {
  beforeEach(async () => {
    await redis.flushdb();
    await db
      .update(schema.chiiUserFields)
      .set({ blocklist: '' })
      .where(op.eq(schema.chiiUserFields.uid, 287622));
  });

  afterEach(async () => {
    await redis.flushdb();
    await db
      .update(schema.chiiUserFields)
      .set({ blocklist: '' })
      .where(op.eq(schema.chiiUserFields.uid, 287622));
  });

  test('should add user to blocklist', async () => {
    const app = createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        userID: 287622,
      },
    });
    await app.register(setup);
    const res = await app.inject({
      method: 'put',
      url: '/blocklist/1',
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ blocklist: [1] });

    const [field] = await db
      .select()
      .from(schema.chiiUserFields)
      .where(op.eq(schema.chiiUserFields.uid, 287622));
    expect(field?.blocklist).toBe('1');

    const res2 = await app.inject({
      method: 'delete',
      url: '/blocklist/1',
    });
    expect(res2.statusCode).toBe(200);
    expect(res2.json()).toEqual({ blocklist: [] });

    const [field2] = await db
      .select()
      .from(schema.chiiUserFields)
      .where(op.eq(schema.chiiUserFields.uid, 287622));
    expect(field2?.blocklist).toBe('');
  });
});
