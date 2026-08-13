import { afterEach, describe, expect, test } from 'vitest';

import { db, op, schema } from '@app/drizzle';
import redis from '@app/lib/redis.ts';
import { CommentState } from '@app/lib/topic/type.ts';
import { createTestServer } from '@app/tests/utils.ts';

import { setup } from './rakuen.ts';

const topicTypes = ['group', 'subject', 'episode', 'character', 'person'];

// 回归测试插入的数据，统一清理
const insertedTopicIDs: number[] = [];
const insertedCharacterIDs: number[] = [];

afterEach(async () => {
  if (insertedTopicIDs.length > 0) {
    await db
      .delete(schema.chiiGroupTopics)
      .where(op.inArray(schema.chiiGroupTopics.id, insertedTopicIDs));
    insertedTopicIDs.length = 0;
  }
  if (insertedCharacterIDs.length > 0) {
    await db
      .delete(schema.chiiCharacters)
      .where(op.inArray(schema.chiiCharacters.id, insertedCharacterIDs));
    insertedCharacterIDs.length = 0;
  }
  await redis.flushdb();
});

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

  test('should exclude non-public topic states from group aggregate', async () => {
    const now = Math.floor(Date.now() / 1000);
    const rows = [
      {
        id: 990001,
        gid: 1,
        uid: 382951,
        title: 'rakuen-test-normal',
        createdAt: now,
        updatedAt: now,
        replies: 1,
        state: CommentState.Normal,
        display: 1,
      },
      {
        id: 990002,
        gid: 1,
        uid: 382951,
        title: 'rakuen-test-closed',
        createdAt: now,
        updatedAt: now,
        replies: 1,
        state: CommentState.AdminCloseTopic,
        display: 1,
      },
      {
        id: 990003,
        gid: 1,
        uid: 382951,
        title: 'rakuen-test-silent',
        createdAt: now,
        updatedAt: now,
        replies: 1,
        state: CommentState.AdminSilentTopic,
        display: 1,
      },
    ];
    await db.insert(schema.chiiGroupTopics).values(rows);
    insertedTopicIDs.push(...rows.map((r) => r.id));

    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/rakuen/topics',
      query: { type: 'group', limit: '200' },
    });
    expect(res.statusCode).toBe(200);
    const titles = res.json().data.map((x: { title: string }) => x.title);
    expect(titles).toContain('rakuen-test-normal');
    expect(titles).not.toContain('rakuen-test-closed');
    expect(titles).not.toContain('rakuen-test-silent');
  });

  test('should isolate cache by nsfw permission', async () => {
    const now = Math.floor(Date.now() / 1000);
    await db.insert(schema.chiiCharacters).values({
      id: 990001,
      name: 'rakuen-test-nsfw',
      role: 1,
      infobox: '',
      summary: '',
      img: '',
      comment: 1,
      collects: 0,
      createdAt: now,
      lastPost: now,
      lock: 0,
      anidbImg: '',
      anidbId: 0,
      ban: 0,
      redirect: 0,
      nsfw: true,
    });
    insertedCharacterIDs.push(990001);

    const restricted = createTestServer();
    await restricted.register(setup);
    const nsfw = createTestServer({ auth: { allowNsfw: true } });
    await nsfw.register(setup);

    const r1 = await restricted.inject({
      method: 'get',
      url: '/rakuen/topics',
      query: { type: 'character', limit: '200' },
    });
    expect(r1.statusCode).toBe(200);
    const names1 = r1.json().data.map((x: { name: string }) => x.name);
    expect(names1).not.toContain('rakuen-test-nsfw');

    const r2 = await nsfw.inject({
      method: 'get',
      url: '/rakuen/topics',
      query: { type: 'character', limit: '200' },
    });
    expect(r2.statusCode).toBe(200);
    const names2 = r2.json().data.map((x: { name: string }) => x.name);
    expect(names2).toContain('rakuen-test-nsfw');

    // 未开启 NSFW 的用户不应读到上一步 nsfw 权限建立的缓存
    const r3 = await restricted.inject({
      method: 'get',
      url: '/rakuen/topics',
      query: { type: 'character', limit: '200' },
    });
    expect(r3.statusCode).toBe(200);
    const names3 = r3.json().data.map((x: { name: string }) => x.name);
    expect(names3).not.toContain('rakuen-test-nsfw');
  });
});
