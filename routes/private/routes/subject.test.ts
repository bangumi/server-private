import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { db, op, schema } from '@app/drizzle';
import { emptyAuth } from '@app/lib/auth/index.ts';
import { LikeType } from '@app/lib/like';
import redis from '@app/lib/redis.ts';
import { CollectionType } from '@app/lib/subject/type.ts';
import { CommentState } from '@app/lib/topic/type.ts';
import { getFriendsCacheKey } from '@app/lib/user/cache.ts';
import { createTestServer } from '@app/tests/utils.ts';

import { setup } from './subject.ts';

describe('subject', () => {
  test('should get subject', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/subjects/12',
    });
    expect(res.json()).toMatchSnapshot();
  });

  test('should get subject episodes', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/subjects/12/episodes',
      query: { limit: '2', offset: '0' },
    });
    expect(res.json()).toMatchSnapshot();
  });

  test('should get subject relations', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/subjects/12/relations',
      query: { limit: '2', offset: '0' },
    });
    expect(res.json()).toMatchSnapshot();
  });

  test('should get subject characters', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/subjects/12/characters',
      query: { limit: '2', offset: '0' },
    });
    expect(res.json()).toMatchSnapshot();
  });

  test('should get subject staffs persons', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/subjects/12/staffs/persons',
      query: { limit: '2', offset: '0' },
    });
    expect(res.json()).toMatchSnapshot();
  });

  test('should get subject staffs positions', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/subjects/12/staffs/positions',
      query: { limit: '2', offset: '0' },
    });
    expect(res.json()).toMatchSnapshot();
  });

  test('should get subject recs', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/subjects/12/recs',
      query: { limit: '2', offset: '0' },
    });
    expect(res.json()).toMatchSnapshot();
  });

  test('should get subject comments', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/subjects/12/comments',
      query: { limit: '2', offset: '0' },
    });
    expect(res.json()).toMatchSnapshot();
  });

  test('should get subject reviews', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/subjects/184017/reviews',
      query: { limit: '10', offset: '0' },
    });
    expect(res.json()).toMatchSnapshot();
  });

  test('should get subject indexes', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/subjects/12/indexes',
      query: { limit: '10', offset: '0' },
    });
    expect(res.json()).toMatchSnapshot();
  });

  test('should get subject collects', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/subjects/12/collects',
      query: { limit: '2', offset: '0' },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();

    expect(body).toMatchObject({
      data: expect.any(Array),
      total: expect.any(Number),
    });
    expect(body.data.length).toBeLessThanOrEqual(2);
    expect(body.total).toBeGreaterThanOrEqual(body.data.length);

    for (const collect of body.data) {
      expect(collect).toMatchObject({
        user: expect.objectContaining({
          id: expect.any(Number),
          username: expect.any(String),
        }),
        interest: expect.objectContaining({
          id: expect.any(Number),
          type: expect.any(Number),
          rate: expect.any(Number),
          comment: expect.any(String),
          tags: expect.any(Array),
          updatedAt: expect.any(Number),
        }),
      });
    }
  });
});

describe('subject topics', () => {
  const testSubjectID = 12;
  const testTopicID = 100;
  const testTopicPostID = 100;
  const testUserID = 382951;
  const testPostID = 101;

  beforeEach(async () => {
    await db
      .delete(schema.chiiSubjectTopics)
      .where(op.eq(schema.chiiSubjectTopics.subjectID, testSubjectID));
    await db.delete(schema.chiiSubjectPosts).where(op.eq(schema.chiiSubjectPosts.mid, testTopicID));
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
    await db.insert(schema.chiiSubjectPosts).values({
      id: testTopicPostID,
      mid: testTopicID,
      uid: testUserID,
      content: 'Test Topic Content',
      related: 0,
      state: 0,
      createdAt: 1462335911,
    });
    await db.insert(schema.chiiSubjectPosts).values({
      id: testPostID,
      mid: testTopicID,
      uid: testUserID,
      content: 'Test Reply',
      related: 0,
      state: 0,
      createdAt: 1462335911,
    });
  });

  test('should get subject topics', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: `/subjects/${testSubjectID}/topics`,
      query: { limit: '2', offset: '0' },
    });
    expect(res.json()).toMatchSnapshot();
  });

  test('should get recent subject topics', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: `/subjects/-/topics`,
      query: { limit: '2', offset: '0' },
    });
    expect(res.json()).toMatchSnapshot();
  });

  test('should create new topic', async () => {
    const app = createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        userID: testUserID,
      },
    });
    await app.register(setup);

    const res = await app.inject({
      url: `/subjects/${testSubjectID}/topics`,
      method: 'post',
      payload: {
        title: 'New Topic',
        content: 'New Content',
        turnstileToken: 'fake-response',
      },
    });

    expect(res.statusCode).toBe(200);
    const { id } = res.json();

    const [topic] = await db
      .select()
      .from(schema.chiiSubjectTopics)
      .where(op.eq(schema.chiiSubjectTopics.id, id));
    expect(topic?.title).toBe('New Topic');

    const [post] = await db
      .select()
      .from(schema.chiiSubjectPosts)
      .where(op.eq(schema.chiiSubjectPosts.mid, id))
      .limit(1);
    expect(post?.content).toBe('New Content');
  });

  test('should edit own topic', async () => {
    const app = createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        userID: testUserID,
      },
    });
    await app.register(setup);

    const res = await app.inject({
      url: `/subjects/-/topics/${testTopicID}`,
      method: 'put',
      payload: {
        title: 'Updated Title',
        content: 'Updated Content',
      },
    });

    expect(res.statusCode).toBe(200);

    const [topic] = await db
      .select()
      .from(schema.chiiSubjectTopics)
      .where(op.eq(schema.chiiSubjectTopics.id, testTopicID));
    expect(topic?.title).toBe('Updated Title');
  });

  test('should not edit topic by non-owner', async () => {
    const app = createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        userID: testUserID + 1,
      },
    });
    await app.register(setup);

    const res = await app.inject({
      url: `/subjects/-/topics/${testTopicID}`,
      method: 'put',
      payload: {
        title: 'Unauthorized Update',
        content: 'Unauthorized Content',
      },
    });

    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchSnapshot();
  });

  test('should get subject post', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject(`/subjects/-/posts/${testPostID}`);
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchSnapshot();
  });

  test('should include friendship in subject post', async () => {
    const viewerID = 900_108;
    const cacheKey = getFriendsCacheKey(viewerID);
    await redis.sadd(cacheKey, 0, testUserID);

    const app = createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        userID: viewerID,
      },
    });
    await app.register(setup);

    try {
      const res = await app.inject(`/subjects/-/posts/${testPostID}`);
      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({
        creator: { id: testUserID, isFriend: true },
        topic: { creator: { id: testUserID, isFriend: true } },
      });
    } finally {
      await redis.del(cacheKey);
      await app.close();
    }
  });

  test('should create/edit/delete new post', async () => {
    const app = createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        userID: testUserID,
      },
    });
    await app.register(setup);

    // create post
    const createRes = await app.inject({
      url: `/subjects/-/topics/${testTopicID}/replies`,
      method: 'post',
      payload: {
        content: 'New Reply',
        turnstileToken: 'fake-response',
      },
    });
    expect(createRes.statusCode).toBe(200);
    const { id } = createRes.json();
    const [createdPost] = await db
      .select()
      .from(schema.chiiSubjectPosts)
      .where(op.eq(schema.chiiSubjectPosts.id, id));
    expect(createdPost?.content).toBe('New Reply');
    expect(createdPost?.related).toBe(0);

    // update post
    const updateRes = await app.inject({
      url: `/subjects/-/posts/${id}`,
      method: 'put',
      payload: {
        content: 'Updated Reply',
      },
    });
    expect(updateRes.statusCode).toBe(200);
    const [updatedPost] = await db
      .select()
      .from(schema.chiiSubjectPosts)
      .where(op.eq(schema.chiiSubjectPosts.id, id));
    expect(updatedPost?.content).toBe('Updated Reply');

    // delete post
    const deleteRes = await app.inject({
      url: `/subjects/-/posts/${id}`,
      method: 'delete',
    });
    expect(deleteRes.statusCode).toBe(200);
    const [deletedPost] = await db
      .select()
      .from(schema.chiiSubjectPosts)
      .where(op.eq(schema.chiiSubjectPosts.id, id));
    expect(deletedPost?.state).toBe(CommentState.UserDelete);
  });
});

describe('subject comment write APIs', () => {
  const TEST_USER_ID = 382951;
  const TEST_COMMENT_ID = 1; // uid=382951, subjectID=8, hasComment=1
  const OTHER_COMMENT_ID = 3; // uid=2703, subjectID=4, hasComment=0

  async function reset() {
    // 恢复 dist.sql 初始数据
    await db
      .update(schema.chiiSubjectInterests)
      .set({
        comment: 'test comment',
        hasComment: 1,
        rate: 0,
        type: CollectionType.Collect,
        privacy: 0,
        updatedAt: 1639569371,
      })
      .where(op.eq(schema.chiiSubjectInterests.id, TEST_COMMENT_ID));
    await db
      .update(schema.chiiSubjectInterests)
      .set({
        comment: '',
        hasComment: 0,
        rate: 0,
        type: CollectionType.Wish,
        privacy: 0,
        updatedAt: 1639569404,
      })
      .where(op.eq(schema.chiiSubjectInterests.id, 2));
    await db
      .update(schema.chiiSubjectInterests)
      .set({
        comment: '',
        hasComment: 0,
        rate: 0,
        type: CollectionType.Wish,
        privacy: 0,
        updatedAt: 1639569404,
      })
      .where(op.eq(schema.chiiSubjectInterests.id, OTHER_COMMENT_ID));
    // subject 12 创建路径清理
    await db
      .delete(schema.chiiSubjectInterests)
      .where(
        op.and(
          op.eq(schema.chiiSubjectInterests.uid, TEST_USER_ID),
          op.eq(schema.chiiSubjectInterests.subjectID, 12),
        ),
      );
    await db
      .update(schema.chiiSubjects)
      .set({ wish: 1159, collect: 4534, doing: 215 })
      .where(op.eq(schema.chiiSubjects.id, 12));
    await db
      .update(schema.chiiSubjectFields)
      .set({ rate10: 168 })
      .where(op.eq(schema.chiiSubjectFields.id, 12));
    // 清理吐槽点赞
    await db
      .delete(schema.chiiLikes)
      .where(
        op.and(
          op.eq(schema.chiiLikes.type, LikeType.SubjectCollect),
          op.inArray(schema.chiiLikes.relatedID, [TEST_COMMENT_ID, 2, OTHER_COMMENT_ID]),
        ),
      );
  }

  beforeEach(async () => {
    await reset();
  });

  afterEach(async () => {
    await reset();
  });

  test('should create subject comment on existing collection', async () => {
    const app = createTestServer({
      auth: { ...emptyAuth(), login: true, userID: TEST_USER_ID },
    });
    await app.register(setup);

    const res = await app.inject({
      method: 'post',
      url: '/subjects/4/comments',
      payload: { comment: 'new comment', turnstileToken: 'fake-response' },
    });
    expect(res.statusCode).toBe(200);
    const { id } = res.json();
    expect(id).toBe(2); // 已有收藏 id=2，更新吐槽
    const [interest] = await db
      .select()
      .from(schema.chiiSubjectInterests)
      .where(op.eq(schema.chiiSubjectInterests.id, 2));
    expect(interest?.comment).toBe('new comment');
    expect(interest?.hasComment).toBe(1);
  });

  test('should trim comment', async () => {
    const app = createTestServer({
      auth: { ...emptyAuth(), login: true, userID: TEST_USER_ID },
    });
    await app.register(setup);

    const res = await app.inject({
      method: 'post',
      url: '/subjects/4/comments',
      payload: { comment: '  spaced comment  ', turnstileToken: 'fake-response' },
    });
    expect(res.statusCode).toBe(200);
    const [interest] = await db
      .select()
      .from(schema.chiiSubjectInterests)
      .where(op.eq(schema.chiiSubjectInterests.id, 2));
    expect(interest?.comment).toBe('spaced comment');
  });

  test('should force rate to 0 for wish collection', async () => {
    const app = createTestServer({
      auth: { ...emptyAuth(), login: true, userID: TEST_USER_ID },
    });
    await app.register(setup);

    const res = await app.inject({
      method: 'post',
      url: '/subjects/12/comments',
      payload: {
        comment: 'wish comment',
        type: CollectionType.Wish,
        rate: 5,
        turnstileToken: 'fake-response',
      },
    });
    expect(res.statusCode).toBe(200);
    const { id } = res.json();
    const [interest] = await db
      .select()
      .from(schema.chiiSubjectInterests)
      .where(op.eq(schema.chiiSubjectInterests.id, id));
    expect(interest?.rate).toBe(0);
    expect(interest?.type).toBe(CollectionType.Wish);
  });

  test('should create subject comment with new collection', async () => {
    const app = createTestServer({
      auth: { ...emptyAuth(), login: true, userID: TEST_USER_ID },
    });
    await app.register(setup);

    const res = await app.inject({
      method: 'post',
      url: '/subjects/12/comments',
      payload: {
        comment: 'new comment',
        type: CollectionType.Collect,
        turnstileToken: 'fake-response',
      },
    });
    expect(res.statusCode).toBe(200);
    const { id } = res.json();
    expect(typeof id).toBe('number');
    const [interest] = await db
      .select()
      .from(schema.chiiSubjectInterests)
      .where(
        op.and(
          op.eq(schema.chiiSubjectInterests.uid, TEST_USER_ID),
          op.eq(schema.chiiSubjectInterests.subjectID, 12),
        ),
      );
    expect(interest?.comment).toBe('new comment');
    expect(interest?.hasComment).toBe(1);
    expect(interest?.type).toBe(CollectionType.Collect);
    const [subject] = await db
      .select()
      .from(schema.chiiSubjects)
      .where(op.eq(schema.chiiSubjects.id, 12));
    expect(subject?.collect).toBe(4535);
  });

  test('should require type on new subject comment', async () => {
    const app = createTestServer({
      auth: { ...emptyAuth(), login: true, userID: TEST_USER_ID },
    });
    await app.register(setup);
    const res = await app.inject({
      method: 'post',
      url: '/subjects/12/comments',
      payload: { comment: 'new comment', turnstileToken: 'fake-response' },
    });
    expect(res.statusCode).toBe(400);
  });

  test('should not create subject comment without login', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'post',
      url: '/subjects/8/comments',
      payload: { comment: 'new comment', turnstileToken: 'fake-response' },
    });
    expect(res.statusCode).toBe(401);
  });

  test('should update own subject comment', async () => {
    const app = createTestServer({
      auth: { ...emptyAuth(), login: true, userID: TEST_USER_ID },
    });
    await app.register(setup);
    const res = await app.inject({
      method: 'put',
      url: `/subjects/-/comments/${TEST_COMMENT_ID}`,
      payload: { comment: 'updated comment' },
    });
    expect(res.statusCode).toBe(200);
    const [interest] = await db
      .select()
      .from(schema.chiiSubjectInterests)
      .where(op.eq(schema.chiiSubjectInterests.id, TEST_COMMENT_ID));
    expect(interest?.comment).toBe('updated comment');
  });

  test('should not update comment of others', async () => {
    // 先把 OTHER_COMMENT_ID 变成"别人的吐槽"以覆盖权限分支
    await db
      .update(schema.chiiSubjectInterests)
      .set({ comment: 'other comment', hasComment: 1 })
      .where(op.eq(schema.chiiSubjectInterests.id, OTHER_COMMENT_ID));
    const app = createTestServer({
      auth: { ...emptyAuth(), login: true, userID: TEST_USER_ID },
    });
    await app.register(setup);
    const res = await app.inject({
      method: 'put',
      url: `/subjects/-/comments/${OTHER_COMMENT_ID}`,
      payload: { comment: 'updated comment' },
    });
    expect(res.statusCode).toBe(403);
  });

  test('should delete own subject comment', async () => {
    const app = createTestServer({
      auth: { ...emptyAuth(), login: true, userID: TEST_USER_ID },
    });
    await app.register(setup);
    const res = await app.inject({
      method: 'delete',
      url: `/subjects/-/comments/${TEST_COMMENT_ID}`,
    });
    expect(res.statusCode).toBe(200);
    const [interest] = await db
      .select()
      .from(schema.chiiSubjectInterests)
      .where(op.eq(schema.chiiSubjectInterests.id, TEST_COMMENT_ID));
    expect(interest?.hasComment).toBe(0);
    expect(interest?.comment).toBe('');
  });

  test('should not delete comment of others', async () => {
    await db
      .update(schema.chiiSubjectInterests)
      .set({ comment: 'other comment', hasComment: 1 })
      .where(op.eq(schema.chiiSubjectInterests.id, OTHER_COMMENT_ID));
    const app = createTestServer({
      auth: { ...emptyAuth(), login: true, userID: TEST_USER_ID },
    });
    await app.register(setup);
    const res = await app.inject({
      method: 'delete',
      url: `/subjects/-/comments/${OTHER_COMMENT_ID}`,
    });
    expect(res.statusCode).toBe(403);
  });

  test('should reject empty comment after trim', async () => {
    const app = createTestServer({
      auth: { ...emptyAuth(), login: true, userID: TEST_USER_ID },
    });
    await app.register(setup);
    const res = await app.inject({
      method: 'post',
      url: '/subjects/8/comments',
      payload: { comment: ' '.repeat(3), turnstileToken: 'fake-response' },
    });
    expect(res.statusCode).toBe(400);
  });

  test('should reject comment with invisible characters', async () => {
    const app = createTestServer({
      auth: { ...emptyAuth(), login: true, userID: TEST_USER_ID },
    });
    await app.register(setup);
    const res = await app.inject({
      method: 'post',
      url: '/subjects/8/comments',
      payload: { comment: 'bad\u200Bword', turnstileToken: 'fake-response' },
    });
    expect(res.statusCode).toBe(400);
  });

  test('should reject comment longer than 380 characters', async () => {
    const app = createTestServer({
      auth: { ...emptyAuth(), login: true, userID: TEST_USER_ID },
    });
    await app.register(setup);
    const res = await app.inject({
      method: 'post',
      url: '/subjects/8/comments',
      payload: { comment: 'a'.repeat(381), turnstileToken: 'fake-response' },
    });
    expect(res.statusCode).toBe(400);
  });

  test('should reject subject comment when user is banned', async () => {
    const app = createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        userID: TEST_USER_ID,
        permission: { ban_post: true },
      },
    });
    await app.register(setup);
    const res = await app.inject({
      method: 'post',
      url: '/subjects/8/comments',
      payload: { comment: 'new comment', turnstileToken: 'fake-response' },
    });
    expect(res.statusCode).toBe(403);
  });

  test('should restore shadow-banned comment to private on update', async () => {
    await db
      .update(schema.chiiSubjectInterests)
      .set({ privacy: 2 })
      .where(op.eq(schema.chiiSubjectInterests.id, TEST_COMMENT_ID));
    const app = createTestServer({
      auth: { ...emptyAuth(), login: true, userID: TEST_USER_ID },
    });
    await app.register(setup);
    const res = await app.inject({
      method: 'put',
      url: `/subjects/-/comments/${TEST_COMMENT_ID}`,
      payload: { comment: 'clean text' },
    });
    expect(res.statusCode).toBe(200);
    const [interest] = await db
      .select()
      .from(schema.chiiSubjectInterests)
      .where(op.eq(schema.chiiSubjectInterests.id, TEST_COMMENT_ID));
    expect(interest?.privacy).toBe(1); // ShadowBan 解除后恢复为仅自己可见
  });

  test('should like subject comment', async () => {
    const app = createTestServer({
      auth: { ...emptyAuth(), login: true, userID: TEST_USER_ID },
    });
    await app.register(setup);
    const res = await app.inject({
      method: 'put',
      url: `/subjects/-/comments/${TEST_COMMENT_ID}/like`,
      payload: { value: 0 },
    });
    expect(res.statusCode).toBe(200);
    const [like] = await db
      .select()
      .from(schema.chiiLikes)
      .where(
        op.and(
          op.eq(schema.chiiLikes.type, LikeType.SubjectCollect),
          op.eq(schema.chiiLikes.relatedID, TEST_COMMENT_ID),
          op.eq(schema.chiiLikes.uid, TEST_USER_ID),
        ),
      );
    expect(like?.deleted).toBe(false);
  });

  test('should unlike subject comment', async () => {
    const app = createTestServer({
      auth: { ...emptyAuth(), login: true, userID: TEST_USER_ID },
    });
    await app.register(setup);
    const likeRes = await app.inject({
      method: 'put',
      url: `/subjects/-/comments/${TEST_COMMENT_ID}/like`,
      payload: { value: 0 },
    });
    expect(likeRes.statusCode).toBe(200);
    const unlikeRes = await app.inject({
      method: 'delete',
      url: `/subjects/-/comments/${TEST_COMMENT_ID}/like`,
    });
    expect(unlikeRes.statusCode).toBe(200);
    const [like] = await db
      .select()
      .from(schema.chiiLikes)
      .where(
        op.and(
          op.eq(schema.chiiLikes.type, LikeType.SubjectCollect),
          op.eq(schema.chiiLikes.relatedID, TEST_COMMENT_ID),
          op.eq(schema.chiiLikes.uid, TEST_USER_ID),
        ),
      );
    expect(like?.deleted).toBe(true);
  });
});
