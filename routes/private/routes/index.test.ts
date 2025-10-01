import { DateTime } from 'luxon';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { db, op, schema } from '@app/drizzle';
import { emptyAuth } from '@app/lib/auth/index.ts';
import { IndexRelatedCategory } from '@app/lib/index/types.ts';
import redis from '@app/lib/redis.ts';
import { SubjectType } from '@app/lib/subject/type.ts';
import { createTestServer } from '@app/tests/utils.ts';

import { setup } from './index.ts';

const TEST_INDEX_ID = 15045;
const TEST_USER_ID = 14127;

const createTestIndexRelated = async (app: any, payload: any) => {
  const res = await app.inject({
    method: 'put',
    url: `/indexes/${TEST_INDEX_ID}/related`,
    payload,
  });
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return res;
};

describe('index APIs', () => {
  let createdIndexId: number | null = null;

  beforeEach(async () => {
    vi.spyOn(DateTime, 'now').mockReturnValue(DateTime.fromSeconds(1020240000) as DateTime);
    await db
      .update(schema.chiiIndexes)
      .set({
        replies: 0,
        updatedAt: 1020240000,
      })
      .where(op.eq(schema.chiiIndexes.id, TEST_INDEX_ID));
    await db
      .delete(schema.chiiIndexRelated)
      .where(
        op.and(
          op.eq(schema.chiiIndexRelated.rid, TEST_INDEX_ID),
          op.inArray(schema.chiiIndexRelated.sid, [12, 32]),
        ),
      );
    await db
      .delete(schema.chiiIndexComments)
      .where(op.eq(schema.chiiIndexComments.mid, TEST_INDEX_ID));
  });

  afterEach(async () => {
    vi.clearAllMocks();
    await db
      .update(schema.chiiIndexes)
      .set({
        replies: 0,
        updatedAt: 1020240000,
      })
      .where(op.eq(schema.chiiIndexes.id, TEST_INDEX_ID));
    await db
      .delete(schema.chiiIndexRelated)
      .where(
        op.and(
          op.eq(schema.chiiIndexRelated.rid, TEST_INDEX_ID),
          op.inArray(schema.chiiIndexRelated.sid, [12, 32]),
        ),
      );
    await db
      .delete(schema.chiiIndexComments)
      .where(op.eq(schema.chiiIndexComments.mid, TEST_INDEX_ID));

    if (createdIndexId) {
      await db.delete(schema.chiiIndexes).where(op.eq(schema.chiiIndexes.id, createdIndexId));
      await db
        .delete(schema.chiiIndexRelated)
        .where(op.eq(schema.chiiIndexRelated.rid, createdIndexId));
      await db
        .delete(schema.chiiIndexComments)
        .where(op.eq(schema.chiiIndexComments.mid, createdIndexId));
      createdIndexId = null;
    }
  });

  describe('POST /indexes', () => {
    test('should create index successfully', async () => {
      const app = createTestServer({
        auth: { login: true, userID: TEST_USER_ID },
      });
      await app.register(setup);
      const res = await app.inject({
        method: 'post',
        url: '/indexes',
        payload: {
          title: 'Test Index',
          desc: 'Test description',
        },
      });
      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data).toHaveProperty('id');
      expect(typeof data.id).toBe('number');
      createdIndexId = data.id;
    });

    test('should create index with minimal data', async () => {
      const app = createTestServer({
        auth: { login: true, userID: TEST_USER_ID },
      });
      await app.register(setup);
      const res = await app.inject({
        method: 'post',
        url: '/indexes',
        payload: {
          title: 'Minimal Index',
          desc: 'Minimal description',
        },
      });
      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data).toHaveProperty('id');
      createdIndexId = data.id;
    });

    test('should return 401 for unauthenticated request', async () => {
      const app = createTestServer({});
      await app.register(setup);
      const res = await app.inject({
        method: 'post',
        url: '/indexes',
        payload: {
          title: 'Test Index',
          desc: 'Test description',
        },
        headers: {},
      });
      expect(res.statusCode).toBe(401);
    });
  });

  describe('PATCH /indexes/:indexID', () => {
    test('should update index successfully', async () => {
      const app = createTestServer({
        auth: { login: true, userID: TEST_USER_ID },
      });
      await app.register(setup);

      const createRes = await app.inject({
        method: 'post',
        url: '/indexes',
        payload: {
          title: 'Original Title',
          desc: 'Original description',
        },
      });
      expect(createRes.statusCode).toBe(200);
      const { id } = createRes.json();
      createdIndexId = id;

      const updateRes = await app.inject({
        method: 'patch',
        url: `/indexes/${id}`,
        payload: {
          title: 'Updated Title',
          desc: 'Updated description',
        },
      });
      expect(updateRes.statusCode).toBe(200);
    });

    test('should update index with partial data', async () => {
      const app = createTestServer({
        auth: { login: true, userID: TEST_USER_ID },
      });
      await app.register(setup);

      const createRes = await app.inject({
        method: 'post',
        url: '/indexes',
        payload: {
          title: 'Original Title',
          desc: 'Original description',
        },
      });
      expect(createRes.statusCode).toBe(200);
      const { id } = createRes.json();
      createdIndexId = id;

      const updateRes = await app.inject({
        method: 'patch',
        url: `/indexes/${id}`,
        payload: {
          title: 'Updated Title Only',
        },
      });
      expect(updateRes.statusCode).toBe(200);
    });

    test('should return 404 for non-existent index', async () => {
      const app = createTestServer({
        auth: { login: true, userID: TEST_USER_ID },
      });
      await app.register(setup);
      const res = await app.inject({
        method: 'patch',
        url: '/indexes/999999',
        payload: {
          title: 'Updated Title',
        },
      });
      expect(res.statusCode).toBe(404);
    });

    test('should return 401 for unauthenticated request', async () => {
      const app = createTestServer();
      await app.register(setup);

      const createRes = await app.inject({
        method: 'post',
        url: '/indexes',
        payload: {
          title: 'Original Title',
          desc: 'Original description',
        },
      });
      expect(createRes.statusCode).toBe(401);

      const updateRes = await app.inject({
        method: 'patch',
        url: `/indexes/${TEST_INDEX_ID}`,
        payload: {
          title: 'Updated Title',
        },
        headers: {},
      });
      expect(updateRes.statusCode).toBe(401);
    });
  });

  describe('GET /indexes/:indexID', () => {
    test('should get index successfully', async () => {
      const app = createTestServer();
      await app.register(setup);
      const res = await app.inject({
        method: 'get',
        url: `/indexes/${TEST_INDEX_ID}`,
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchSnapshot();
    });

    test('should return 404 for non-existent index', async () => {
      const app = createTestServer({});
      await app.register(setup);
      const res = await app.inject({
        method: 'get',
        url: '/indexes/999999',
      });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('GET /indexes/:indexID/related', () => {
    test('should get index related successfully', async () => {
      const app = createTestServer();
      await app.register(setup);
      const res = await app.inject({
        method: 'get',
        url: `/indexes/${TEST_INDEX_ID}/related`,
        query: {
          limit: '5',
        },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchSnapshot();
    });

    test('should get index related with filters', async () => {
      const app = createTestServer();
      await app.register(setup);
      const res = await app.inject({
        method: 'get',
        url: `/indexes/${TEST_INDEX_ID}/related?cat=0&type=2&limit=5&offset=10`,
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchSnapshot();
    });

    test('should return 404 for non-existent index', async () => {
      const app = createTestServer();
      await app.register(setup);
      const res = await app.inject({
        method: 'get',
        url: '/indexes/999999/related',
      });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('PUT /indexes/:indexID/related', () => {
    test('should create new index related item', async () => {
      const app = createTestServer({
        auth: { login: true, userID: TEST_USER_ID },
      });
      await app.register(setup);
      const res = await app.inject({
        method: 'put',
        url: `/indexes/${TEST_INDEX_ID}/related`,
        payload: {
          cat: IndexRelatedCategory.Subject,
          type: SubjectType.Anime,
          sid: 12,
          order: 1,
          comment: 'Test comment',
          award: 'Test award',
        },
      });
      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data).toHaveProperty('id');
      expect(typeof data.id).toBe('number');
    });

    test('should create index related item with minimal data', async () => {
      const app = createTestServer({
        auth: { login: true, userID: TEST_USER_ID }, // TEST_INDEX_ID 15045 对应的 uid
      });
      await app.register(setup);
      const res = await app.inject({
        method: 'put',
        url: `/indexes/${TEST_INDEX_ID}/related`,
        payload: {
          cat: IndexRelatedCategory.Character,
          type: 1,
          sid: 32,
        },
      });
      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data).toHaveProperty('id');
    });

    test('should return 404 for non-existent index', async () => {
      const app = createTestServer({
        auth: { login: true, userID: TEST_USER_ID },
      });
      await app.register(setup);
      const res = await app.inject({
        method: 'put',
        url: '/indexes/999999/related',
        payload: {
          cat: IndexRelatedCategory.Subject,
          type: SubjectType.Anime,
          sid: 12,
        },
      });
      expect(res.statusCode).toBe(404);
    });

    test('should handle conflict when item already exists', async () => {
      const app = createTestServer({
        auth: { login: true, userID: TEST_USER_ID }, // TEST_INDEX_ID 15045 对应的 uid
      });
      await app.register(setup);

      const createRes = await createTestIndexRelated(app, {
        cat: IndexRelatedCategory.Subject,
        type: SubjectType.Anime,
        sid: 12,
      });
      expect(createRes.statusCode).toBe(200);

      const conflictRes = await createTestIndexRelated(app, {
        cat: IndexRelatedCategory.Subject,
        type: SubjectType.Anime,
        sid: 12,
      });
      expect(conflictRes.statusCode).toBe(409);
    });

    test('should return 401 for unauthenticated request', async () => {
      const app = createTestServer();
      await app.register(setup);
      const res = await app.inject({
        method: 'put',
        url: `/indexes/${TEST_INDEX_ID}/related`,
        payload: {
          cat: IndexRelatedCategory.Subject,
          type: SubjectType.Anime,
          sid: 12,
        },
      });
      expect(res.statusCode).toBe(401);
    });

    test('should return 404 for non-owner user', async () => {
      const app = createTestServer({
        auth: { login: true, userID: 99999 }, // 非目录创建者
      });
      await app.register(setup);
      const res = await app.inject({
        method: 'put',
        url: `/indexes/${TEST_INDEX_ID}/related`,
        payload: {
          cat: IndexRelatedCategory.Subject,
          type: SubjectType.Anime,
          sid: 12,
        },
      });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('PATCH /indexes/:indexID/related/:id', () => {
    test('should update index related item', async () => {
      const app = createTestServer({
        auth: { login: true, userID: TEST_USER_ID },
      });
      await app.register(setup);

      const createRes = await createTestIndexRelated(app, {
        cat: IndexRelatedCategory.Subject,
        type: SubjectType.Anime,
        sid: 12,
        order: 1,
        comment: 'Original comment',
      });
      expect(createRes.statusCode).toBe(200);
      const { id } = createRes.json();

      const updateRes = await app.inject({
        method: 'patch',
        url: `/indexes/${TEST_INDEX_ID}/related/${id}`,
        payload: {
          order: 5,
          comment: 'Updated comment',
        },
      });
      expect(updateRes.statusCode).toBe(200);
    });

    test('should return 404 for non-existent index', async () => {
      const app = createTestServer({
        auth: { login: true, userID: TEST_USER_ID },
      });
      await app.register(setup);
      const res = await app.inject({
        method: 'patch',
        url: '/indexes/999999/related/1',
        payload: {
          order: 1,
          comment: 'Test',
        },
      });
      expect(res.statusCode).toBe(404);
    });

    test('should return 404 for non-existent related item', async () => {
      const app = createTestServer({
        auth: { login: true, userID: TEST_USER_ID },
      });
      await app.register(setup);
      const res = await app.inject({
        method: 'patch',
        url: `/indexes/${TEST_INDEX_ID}/related/999999`,
        payload: {
          order: 1,
          comment: 'Test',
        },
      });
      expect(res.statusCode).toBe(404);
    });

    test('should return 401 for unauthenticated request', async () => {
      const app = createTestServer();
      await app.register(setup);
      const res = await app.inject({
        method: 'patch',
        url: `/indexes/${TEST_INDEX_ID}/related/1`,
        payload: {
          order: 1,
          comment: 'Test',
        },
      });
      expect(res.statusCode).toBe(401);
    });

    test('should return 404 for non-owner user', async () => {
      const app = createTestServer({
        auth: { login: true, userID: 99999 },
      });
      await app.register(setup);
      const res = await app.inject({
        method: 'patch',
        url: `/indexes/${TEST_INDEX_ID}/related/1`,
        payload: {
          order: 1,
          comment: 'Test',
        },
      });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('DELETE /indexes/:indexID/related/:id', () => {
    test('should delete index related item', async () => {
      const app = createTestServer({
        auth: { login: true, userID: TEST_USER_ID },
      });
      await app.register(setup);

      const createRes = await createTestIndexRelated(app, {
        cat: IndexRelatedCategory.Subject,
        type: SubjectType.Anime,
        sid: 12,
      });
      expect(createRes.statusCode).toBe(200);
      const { id } = createRes.json();
      const deleteRes = await app.inject({
        method: 'delete',
        url: `/indexes/${TEST_INDEX_ID}/related/${id}`,
      });
      expect(deleteRes.statusCode).toBe(200);
    });

    test('should return 404 for non-existent index', async () => {
      const app = createTestServer({
        auth: { login: true, userID: TEST_USER_ID },
      });
      await app.register(setup);
      const res = await app.inject({
        method: 'delete',
        url: '/indexes/999999/related/1',
      });
      expect(res.statusCode).toBe(404);
    });

    test('should return 404 for non-existent related item', async () => {
      const app = createTestServer({
        auth: { login: true, userID: TEST_USER_ID },
      });
      await app.register(setup);
      const res = await app.inject({
        method: 'delete',
        url: `/indexes/${TEST_INDEX_ID}/related/999999`,
      });
      expect(res.statusCode).toBe(404);
    });

    test('should return 401 for unauthenticated request', async () => {
      const app = createTestServer();
      await app.register(setup);
      const res = await app.inject({
        method: 'delete',
        url: `/indexes/${TEST_INDEX_ID}/related/1`,
      });
      expect(res.statusCode).toBe(401);
    });

    test('should return 404 for non-owner user', async () => {
      const app = createTestServer({
        auth: { login: true, userID: 99999 },
      });
      await app.register(setup);
      const res = await app.inject({
        method: 'delete',
        url: `/indexes/${TEST_INDEX_ID}/related/1`,
      });
      expect(res.statusCode).toBe(404);
    });
  });
});

describe('index comments', () => {
  beforeEach(async () => {
    await redis.flushdb();
    await db
      .delete(schema.chiiIndexComments)
      .where(op.eq(schema.chiiIndexComments.mid, TEST_INDEX_ID));
    await db.insert(schema.chiiIndexComments).values({
      id: 12345680,
      mid: TEST_INDEX_ID,
      content: '测试目录评论',
      createdAt: 1718275200,
      uid: TEST_USER_ID,
      related: 0,
    });
    await db.insert(schema.chiiIndexComments).values({
      id: 12345681,
      mid: TEST_INDEX_ID,
      content: '测试目录评论2',
      createdAt: 1718275200,
      uid: TEST_USER_ID,
      related: 12345680,
    });
    await db.insert(schema.chiiIndexComments).values({
      id: 12345682,
      mid: TEST_INDEX_ID,
      content: '测试目录评论3',
      createdAt: 1718275200,
      uid: TEST_USER_ID,
      related: 12345680,
    });
  });

  afterEach(async () => {
    await redis.flushdb();
    await db
      .delete(schema.chiiIndexComments)
      .where(op.eq(schema.chiiIndexComments.mid, TEST_INDEX_ID));
  });

  test('should get index comments', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: `/indexes/${TEST_INDEX_ID}/comments`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchSnapshot();
  });

  test('should create index comment', async () => {
    const app = createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        userID: TEST_USER_ID,
      },
    });
    await app.register(setup);
    const res = await app.inject({
      method: 'post',
      url: `/indexes/${TEST_INDEX_ID}/comments`,
      payload: { content: '测试目录评论4', turnstileToken: 'fake-response' },
    });
    expect(res.statusCode).toBe(200);
    const commentID: number = res.json().id;
    const [comment] = await db
      .select()
      .from(schema.chiiIndexComments)
      .where(op.eq(schema.chiiIndexComments.id, commentID));
    expect(comment?.content).toBe('测试目录评论4');
  });

  test('should not allow create index comment', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'post',
      url: `/indexes/${TEST_INDEX_ID}/comments`,
      payload: { content: '测试目录评论5', turnstileToken: 'fake-response' },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchSnapshot();
  });

  test('should edit index comment', async () => {
    const app = createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        userID: TEST_USER_ID,
      },
    });
    await app.register(setup);
    const res = await app.inject({
      method: 'put',
      url: `/indexes/-/comments/12345682`,
      payload: { content: '测试目录评论6' },
    });
    expect(res.statusCode).toBe(200);
    const [comment] = await db
      .select()
      .from(schema.chiiIndexComments)
      .where(op.eq(schema.chiiIndexComments.id, 12345682));
    expect(comment?.content).toBe('测试目录评论6');
  });

  test('should not edit index comment with reply', async () => {
    const app = createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        userID: TEST_USER_ID,
      },
    });
    await app.register(setup);
    const res = await app.inject({
      method: 'put',
      url: `/indexes/-/comments/12345680`,
      payload: { content: '测试目录评论7' },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchSnapshot();
  });

  test('should not edit index comment not owned', async () => {
    const app = createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        userID: TEST_USER_ID + 1, // different user
      },
    });
    await app.register(setup);
    const res = await app.inject({
      method: 'put',
      url: `/indexes/-/comments/12345680`,
      payload: { content: '测试目录评论8' },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchSnapshot();
  });

  test('should delete index comment', async () => {
    const app = createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        userID: TEST_USER_ID,
      },
    });
    await app.register(setup);
    const res = await app.inject({
      method: 'delete',
      url: `/indexes/-/comments/12345680`,
    });
    expect(res.statusCode).toBe(200);
    const [comment] = await db
      .select()
      .from(schema.chiiIndexComments)
      .where(op.eq(schema.chiiIndexComments.id, 12345680));
    expect(comment).toBeUndefined();
  });

  test('should not delete index comment not owned', async () => {
    const app = createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        userID: TEST_USER_ID + 1, // different user
      },
    });
    await app.register(setup);
    const res = await app.inject({
      method: 'delete',
      url: `/indexes/-/comments/12345680`,
    });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchSnapshot();
  });

  test('should return 404 for non-existent index when getting comments', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/indexes/999999/comments',
    });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchSnapshot();
  });

  test('should return 404 for non-existent index when creating comment', async () => {
    const app = createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        userID: TEST_USER_ID,
      },
    });
    await app.register(setup);
    const res = await app.inject({
      method: 'post',
      url: '/indexes/999999/comments',
      payload: { content: '测试评论', turnstileToken: 'fake-response' },
    });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchSnapshot();
  });

  test('should return 404 for non-existent comment when editing', async () => {
    const app = createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        userID: TEST_USER_ID,
      },
    });
    await app.register(setup);
    const res = await app.inject({
      method: 'put',
      url: '/indexes/-/comments/999999',
      payload: { content: '测试评论' },
    });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchSnapshot();
  });

  test('should return 404 for non-existent comment when deleting', async () => {
    const app = createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        userID: TEST_USER_ID,
      },
    });
    await app.register(setup);
    const res = await app.inject({
      method: 'delete',
      url: '/indexes/-/comments/999999',
    });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchSnapshot();
  });
});
