import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { db, op, schema } from '@app/drizzle';
import { emptyAuth } from '@app/lib/auth/index.ts';
import redis from '@app/lib/redis.ts';
import { createTestServer } from '@app/tests/utils.ts';

import { setup } from './blog.ts';

describe('blog', () => {
  const testUID = 287622;
  const publicEntryID = 319484;
  const privateEntryID = 319486;

  test('should get blog entry', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: `/blogs/${publicEntryID}`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchSnapshot();
  });

  test('should not get private blog entry from other user', async () => {
    const app = createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        userID: testUID + 1, // different user
      },
    });
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: `/blogs/${privateEntryID}`,
    });
    expect(res.statusCode).toBe(404);
  });

  test('should get private blog entry from friend', async () => {
    const app = createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        userID: 427613, // friend
      },
    });
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: `/blogs/${privateEntryID}`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchSnapshot();
  });

  test('should get private blog entry from self', async () => {
    const app = createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        userID: testUID, // same user
      },
    });
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: `/blogs/${privateEntryID}`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchSnapshot();
  });

  test('should get blog related subjects', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: `/blogs/${publicEntryID}/subjects`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchSnapshot();
  });

  test('should get blog photos', async () => {
    const app = createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        userID: testUID, // same user
      },
    });
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: `/blogs/${publicEntryID}/photos`,
      query: { limit: '2', offset: '0' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchSnapshot();
  });

  test('should not get blog photos from other user', async () => {
    const app = createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        userID: testUID + 1, // other user
      },
    });
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: `/blogs/${privateEntryID}/photos`,
    });
    expect(res.statusCode).toBe(404);
  });
});

describe('blog comments', () => {
  beforeEach(async () => {
    await redis.flushdb();
    await db.delete(schema.chiiBlogComments).where(op.eq(schema.chiiBlogComments.mid, 345911));
    await db.insert(schema.chiiBlogComments).values({
      id: 12345670,
      mid: 345911,
      content: '测试评论',
      createdAt: 1718275200,
      uid: 287622,
      related: 0,
    });
    await db.insert(schema.chiiBlogComments).values({
      id: 12345671,
      mid: 345911,
      content: '测试评论2',
      createdAt: 1718275200,
      uid: 287622,
      related: 12345670,
    });
    await db.insert(schema.chiiBlogComments).values({
      id: 12345672,
      mid: 345911,
      content: '测试评论3',
      createdAt: 1718275200,
      uid: 287622,
      related: 12345670,
    });
  });

  afterEach(async () => {
    await redis.flushdb();
    await db.delete(schema.chiiBlogComments).where(op.eq(schema.chiiBlogComments.mid, 345911));
  });

  test('should get blog comments', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: `/blogs/345911/comments`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchSnapshot();
  });

  test('should create blog comment', async () => {
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
      url: `/blogs/345911/comments`,
      payload: { content: '测试评论4', turnstileToken: 'fake-response' },
    });
    expect(res.statusCode).toBe(200);
    const commentID: number = res.json().id;
    const [comment] = await db
      .select()
      .from(schema.chiiBlogComments)
      .where(op.eq(schema.chiiBlogComments.id, commentID));
    expect(comment?.content).toBe('测试评论4');
  });

  test('should not allow create blog comment', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'post',
      url: `/blogs/345911/comments`,
      payload: { content: '测试评论5', turnstileToken: 'fake-response' },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchSnapshot();
  });

  test('should edit blog comment', async () => {
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
      url: `/blogs/-/comments/12345672`,
      payload: { content: '测试评论6' },
    });
    expect(res.statusCode).toBe(200);
    const [comment] = await db
      .select()
      .from(schema.chiiBlogComments)
      .where(op.eq(schema.chiiBlogComments.id, 12345672));
    expect(comment?.content).toBe('测试评论6');
  });

  test('should not edit blog comment with reply', async () => {
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
      url: `/blogs/-/comments/12345670`,
      payload: { content: '测试评论7' },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchSnapshot();
  });

  test('should not edit blog comment not owned', async () => {
    const app = createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        userID: 287622 + 1, // different user
      },
    });
    await app.register(setup);
    const res = await app.inject({
      method: 'put',
      url: `/blogs/-/comments/12345670`,
      payload: { content: '测试评论8' },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchSnapshot();
  });

  test('should delete blog comment', async () => {
    const app = createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        userID: 287622,
      },
    });
    await app.register(setup);
    const res = await app.inject({
      method: 'delete',
      url: `/blogs/-/comments/12345670`,
    });
    expect(res.statusCode).toBe(200);
    const [comment] = await db
      .select()
      .from(schema.chiiBlogComments)
      .where(op.eq(schema.chiiBlogComments.id, 12345670));
    expect(comment).toBeUndefined();
  });

  test('should not delete blog comment not owned', async () => {
    const app = createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        userID: 287622 + 1, // different user
      },
    });
    await app.register(setup);
    const res = await app.inject({
      method: 'delete',
      url: `/blogs/-/comments/12345670`,
    });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchSnapshot();
  });
});
