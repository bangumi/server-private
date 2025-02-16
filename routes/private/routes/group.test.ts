import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { db, op, schema } from '@app/drizzle';
import { emptyAuth } from '@app/lib/auth/index.ts';
import { createTestServer } from '@app/tests/utils.ts';

import { setup } from './group.ts';
import { CommentState } from '@app/lib/topic/type.ts';

describe('group list', () => {
  test('should get group list', async () => {
    const app = await createTestServer();
    await app.register(setup);

    const res = await app.inject({
      url: '/groups',
      query: {
        sort: 'created',
        limit: '2',
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchSnapshot();
  });
});

describe('group info', () => {
  test('should get group info', async () => {
    const app = await createTestServer();
    await app.register(setup);

    const res = await app.inject('/groups/sandbox');
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchSnapshot();
  });

  test('should get group members', async () => {
    const app = await createTestServer();
    await app.register(setup);

    const res = await app.inject('/groups/sandbox/members');
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchSnapshot();
  });
});

describe('group topics', () => {
  const testGroupID = 4215;
  const testTopicID = 100;
  const testTopicPostID = 100;
  const testUserID = 382951;
  const testPostID = 101;

  beforeEach(async () => {
    await db.delete(schema.chiiGroupTopics).where(op.eq(schema.chiiGroupTopics.gid, testGroupID));
    await db.delete(schema.chiiGroupPosts).where(op.eq(schema.chiiGroupPosts.mid, testTopicID));
    await db.insert(schema.chiiGroupTopics).values({
      id: testTopicID,
      gid: testGroupID,
      uid: testUserID,
      title: 'Test Topic',
      createdAt: 1462335911,
      updatedAt: 1462335911,
      replies: 1,
      state: 0,
      display: 1,
    });
    await db.insert(schema.chiiGroupPosts).values({
      id: testTopicPostID,
      mid: testTopicID,
      uid: testUserID,
      content: 'Test Topic Content',
      related: 0,
      state: 0,
      createdAt: 1462335911,
    });
    await db.insert(schema.chiiGroupPosts).values({
      id: testPostID,
      mid: testTopicID,
      uid: testUserID,
      content: 'Test Reply',
      related: 0,
      state: 0,
      createdAt: 1462335911,
    });
  });

  afterEach(async () => {
    await db.delete(schema.chiiGroupTopics).where(op.eq(schema.chiiGroupTopics.gid, testGroupID));
    await db.delete(schema.chiiGroupPosts).where(op.eq(schema.chiiGroupPosts.mid, testTopicID));
  });

  test('should get recent topics of joined group', async () => {
    const app = await createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        userID: 287622,
      },
    });
    await app.register(setup);

    const res = await app.inject({
      url: '/groups/-/topics',
      query: {
        mode: 'joined',
        limit: '2',
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchSnapshot();
  });

  test('should get recent topics of all group', async () => {
    const app = await createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        userID: 287622,
      },
    });
    await app.register(setup);

    const res = await app.inject({
      url: '/groups/-/topics',
      query: {
        mode: 'all',
        limit: '2',
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchSnapshot();
  });

  test('should get group topics', async () => {
    const app = await createTestServer();
    await app.register(setup);

    const res = await app.inject({
      url: `/groups/sandbox/topics`,
      query: { limit: '2', offset: '0' },
    });
    expect(res.statusCode).toBe(200);
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
      url: `/groups/sandbox/topics`,
      method: 'post',
      payload: {
        title: 'New Topic',
        content: 'New Content',
        turnstileToken: 'fake-response',
      },
    });

    expect(res.statusCode).toBe(200);
    const { id } = res.json() as { id: number };

    const [topic] = await db
      .select()
      .from(schema.chiiGroupTopics)
      .where(op.eq(schema.chiiGroupTopics.id, id));
    expect(topic?.title).toBe('New Topic');

    const [post] = await db
      .select()
      .from(schema.chiiGroupPosts)
      .where(op.eq(schema.chiiGroupPosts.mid, id))
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
      url: `/groups/-/topics/${testTopicID}`,
      method: 'put',
      payload: {
        title: 'Updated Title',
        content: 'Updated Content',
      },
    });

    expect(res.statusCode).toBe(200);

    const [topic] = await db
      .select()
      .from(schema.chiiGroupTopics)
      .where(op.eq(schema.chiiGroupTopics.id, testTopicID));
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
      url: `/groups/-/topics/${testTopicID}`,
      method: 'put',
      payload: {
        title: 'Unauthorized Update',
        content: 'Unauthorized Content',
      },
    });

    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchSnapshot();
  });

  test('should get group post', async () => {
    const app = await createTestServer();
    await app.register(setup);

    const res = await app.inject(`/groups/-/posts/${testPostID}`);
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchSnapshot();
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
      url: `/groups/-/topics/${testTopicID}/replies`,
      method: 'post',
      payload: {
        content: 'New Reply',
        turnstileToken: 'fake-response',
      },
    });
    expect(createRes.statusCode).toBe(200);
    const { id } = createRes.json() as { id: number };
    const [createdPost] = await db
      .select()
      .from(schema.chiiGroupPosts)
      .where(op.eq(schema.chiiGroupPosts.id, id));
    expect(createdPost?.content).toBe('New Reply');
    expect(createdPost?.related).toBe(0);

    // update post
    const updateRes = await app.inject({
      url: `/groups/-/posts/${id}`,
      method: 'put',
      payload: {
        content: 'Updated Reply',
      },
    });
    expect(updateRes.statusCode).toBe(200);
    const [updatedPost] = await db
      .select()
      .from(schema.chiiGroupPosts)
      .where(op.eq(schema.chiiGroupPosts.id, id));
    expect(updatedPost?.content).toBe('Updated Reply');

    // delete post
    const deleteRes = await app.inject({
      url: `/groups/-/posts/${id}`,
      method: 'delete',
    });
    expect(deleteRes.statusCode).toBe(200);
    const [deletedPost] = await db
      .select()
      .from(schema.chiiGroupPosts)
      .where(op.eq(schema.chiiGroupPosts.id, id));
    expect(deletedPost?.state).toBe(CommentState.UserDelete);
  });
});
