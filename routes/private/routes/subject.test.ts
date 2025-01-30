import { beforeEach, describe, expect, test } from 'vitest';

import { db, op } from '@app/drizzle/db.ts';
import * as schema from '@app/drizzle/schema';
import { emptyAuth } from '@app/lib/auth/index.ts';
import { createTestServer } from '@app/tests/utils.ts';

import { setup } from './subject.ts';
import { CommentState } from '@app/lib/topic/type.ts';

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
      query: { limit: '2', offset: '0' },
    });
    expect(res.json()).toMatchSnapshot();
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
      .where(op.eq(schema.chiiSubjectTopics.sid, testSubjectID));
    await db.delete(schema.chiiSubjectPosts).where(op.eq(schema.chiiSubjectPosts.mid, testTopicID));
    await db.insert(schema.chiiSubjectTopics).values({
      id: testTopicID,
      sid: testSubjectID,
      createdAt: 1462335911,
      uid: testUserID,
      title: 'Test Topic',
      state: 0,
      replies: 0,
    });
    await db.insert(schema.chiiSubjectPosts).values({
      id: testTopicPostID,
      mid: testTopicID,
      uid: testUserID,
      content: 'Test Topic Content',
      related: 0,
      state: 0,
    });
    await db.insert(schema.chiiSubjectPosts).values({
      id: testPostID,
      mid: testTopicID,
      uid: testUserID,
      content: 'Test Reply',
      related: 0,
      state: 0,
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
        'cf-turnstile-response': 'fake-response',
      },
    });

    expect(res.statusCode).toBe(200);
    const { id } = res.json() as { id: number };

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

    expect(res.statusCode).toBe(401);
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
      url: `/subjects/-/topics/${testTopicID}/replies`,
      method: 'post',
      payload: {
        content: 'New Reply',
        'cf-turnstile-response': 'fake-response',
      },
    });
    expect(createRes.statusCode).toBe(200);
    const { id } = createRes.json() as { id: number };
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
