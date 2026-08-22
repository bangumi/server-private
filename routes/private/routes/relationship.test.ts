import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { db, op, schema } from '@app/drizzle';
import { emptyAuth } from '@app/lib/auth/index.ts';
import redis from '@app/lib/redis.ts';
import { countUserFriend } from '@app/lib/user/stats.ts';
import { fetchFollowers, fetchFriends, isFriends } from '@app/lib/user/utils.ts';
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
    await db
      .delete(schema.chiiNotify)
      .where(op.and(op.eq(schema.chiiNotify.uid, 287622), op.eq(schema.chiiNotify.fromUID, 1)));
    await db
      .update(schema.chiiUserFields)
      .set({ privacy: '' })
      .where(op.inArray(schema.chiiUserFields.uid, [1, 287622]));
  });

  afterEach(async () => {
    await redis.flushdb();
    await db.delete(schema.chiiFriends).where(op.eq(schema.chiiFriends.uid, 1));
    await db
      .delete(schema.chiiNotify)
      .where(op.and(op.eq(schema.chiiNotify.uid, 287622), op.eq(schema.chiiNotify.fromUID, 1)));
    await db
      .update(schema.chiiUserFields)
      .set({ privacy: '' })
      .where(op.inArray(schema.chiiUserFields.uid, [1, 287622]));
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

    await expect(fetchFriends(1)).resolves.toEqual([]);
    await expect(fetchFollowers(287622)).resolves.not.toContain(1);
    await expect(isFriends(1, 287622)).resolves.toBe(false);
    await expect(countUserFriend(1)).resolves.toBe(0);

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
    await expect(fetchFriends(1)).resolves.toContain(287622);
    await expect(fetchFollowers(287622)).resolves.toContain(1);
    await expect(isFriends(1, 287622)).resolves.toBe(true);
    await expect(countUserFriend(1)).resolves.toBe(1);

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
    await expect(fetchFriends(1)).resolves.not.toContain(287622);
    await expect(fetchFollowers(287622)).resolves.not.toContain(1);
    await expect(isFriends(1, 287622)).resolves.toBe(false);
    await expect(countUserFriend(1)).resolves.toBe(0);
  });

  test('should reject adding friend when follow privacy disallows it', async () => {
    await db
      .update(schema.chiiUserFields)
      .set({ privacy: '{"40":2}' })
      .where(op.eq(schema.chiiUserFields.uid, 287622));

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
    expect(res.statusCode).toBe(403);

    const [friend] = await db
      .select()
      .from(schema.chiiFriends)
      .where(op.and(op.eq(schema.chiiFriends.uid, 1), op.eq(schema.chiiFriends.fid, 287622)));
    expect(friend).toBeUndefined();
  });

  test('should not create friend notification when disabled', async () => {
    await db
      .update(schema.chiiUserFields)
      .set({ privacy: '{"23":2}' })
      .where(op.eq(schema.chiiUserFields.uid, 287622));

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

    const [friend] = await db
      .select()
      .from(schema.chiiFriends)
      .where(op.and(op.eq(schema.chiiFriends.uid, 1), op.eq(schema.chiiFriends.fid, 287622)));
    expect(friend).toBeDefined();

    const notifications = await db
      .select()
      .from(schema.chiiNotify)
      .where(op.and(op.eq(schema.chiiNotify.uid, 287622), op.eq(schema.chiiNotify.fromUID, 1)));
    expect(notifications).toEqual([]);
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
