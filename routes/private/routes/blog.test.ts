import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { db, op, schema } from '@app/drizzle';
import { emptyAuth } from '@app/lib/auth/index.ts';
import redis from '@app/lib/redis.ts';
import { updateTagResult } from '@app/lib/tag';
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

describe('blog entry write APIs', () => {
  // LimitAction.Blog 为 10 分钟 5 次，各测试用不同 userID 避免限频互相影响
  const createUID = 287622; // 已有 blog entry 319484/319486 的测试用户
  const photoUID = 287630;
  const updateUID = 287631;
  const emptyPatchUID = 287632;
  const deleteUID = 287633;
  const otherUID = createUID + 1;
  let createdEntryID: number | null = null;

  async function cleanup() {
    if (createdEntryID) {
      await db
        .delete(schema.chiiBlogEntries)
        .where(op.eq(schema.chiiBlogEntries.id, createdEntryID));
      await db
        .delete(schema.chiiBlogComments)
        .where(op.eq(schema.chiiBlogComments.mid, createdEntryID));
      await db
        .delete(schema.chiiSubjectRelatedBlogs)
        .where(op.eq(schema.chiiSubjectRelatedBlogs.entryID, createdEntryID));
      await db
        .delete(schema.chiiBlogPhotos)
        .where(op.eq(schema.chiiBlogPhotos.eid, createdEntryID));
      const tagList = await db
        .select({ tagID: schema.chiiTagList.tagID })
        .from(schema.chiiTagList)
        .where(
          op.and(
            op.eq(schema.chiiTagList.cat, 1),
            op.eq(schema.chiiTagList.type, 1),
            op.eq(schema.chiiTagList.mainID, createdEntryID),
          ),
        );
      if (tagList.length > 0) {
        await db
          .delete(schema.chiiTagList)
          .where(
            op.and(
              op.eq(schema.chiiTagList.cat, 1),
              op.eq(schema.chiiTagList.type, 1),
              op.eq(schema.chiiTagList.mainID, createdEntryID),
            ),
          );
        await db.transaction(async (t) => {
          await updateTagResult(
            t,
            tagList.map((x) => x.tagID),
          );
        });
      }
      createdEntryID = null;
    }
    await db.delete(schema.chiiBlogPhotos).where(op.eq(schema.chiiBlogPhotos.id, 999999));
  }

  beforeEach(async () => {
    await cleanup();
  });

  afterEach(async () => {
    await cleanup();
  });

  test('should create blog entry', async () => {
    const app = createTestServer({
      auth: { ...emptyAuth(), login: true, userID: createUID },
    });
    await app.register(setup);

    const res = await app.inject({
      method: 'post',
      url: '/blogs',
      payload: {
        title: 'Test Blog',
        content: 'test content',
        tags: ['blog-test-tag'],
        public: true,
        subjectIDs: [12],
        turnstileToken: 'fake-response',
      },
    });
    expect(res.statusCode).toBe(200);
    const { id } = res.json();
    createdEntryID = id;
    expect(typeof id).toBe('number');

    const [entry] = await db
      .select()
      .from(schema.chiiBlogEntries)
      .where(op.eq(schema.chiiBlogEntries.id, id));
    expect(entry?.type).toBe(1);
    expect(entry?.uid).toBe(createUID);
    expect(entry?.title).toBe('Test Blog');
    expect(entry?.content).toBe('test content');
    expect(entry?.tags).toBe('blog-test-tag');
    expect(entry?.public).toBe(true);
    expect(entry?.related).toBe(1);
    expect(entry?.views).toBe(0);
    expect(entry?.replies).toBe(0);

    const [related] = await db
      .select()
      .from(schema.chiiSubjectRelatedBlogs)
      .where(op.eq(schema.chiiSubjectRelatedBlogs.entryID, id));
    expect(related?.subjectID).toBe(12);
    expect(related?.uid).toBe(createUID);

    const [tagList] = await db
      .select()
      .from(schema.chiiTagList)
      .where(
        op.and(op.eq(schema.chiiTagList.userID, createUID), op.eq(schema.chiiTagList.mainID, id)),
      );
    expect(tagList).toBeDefined();
  });

  test('should create blog entry with photoIDs', async () => {
    await db.insert(schema.chiiBlogPhotos).values({
      id: 999999,
      eid: 0,
      uid: photoUID,
      target: 'test.jpg',
      vote: 0,
      createdAt: 1639569404,
    });
    const app = createTestServer({
      auth: { ...emptyAuth(), login: true, userID: photoUID },
    });
    await app.register(setup);

    const res = await app.inject({
      method: 'post',
      url: '/blogs',
      payload: {
        title: 'Test Blog With Photo',
        content: 'content',
        photoIDs: [999999],
        turnstileToken: 'fake-response',
      },
    });
    expect(res.statusCode).toBe(200);
    createdEntryID = res.json().id;

    const [photo] = await db
      .select()
      .from(schema.chiiBlogPhotos)
      .where(op.eq(schema.chiiBlogPhotos.id, 999999));
    expect(photo?.eid).toBe(createdEntryID);
  });

  test('should require login to create blog entry', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'post',
      url: '/blogs',
      payload: { title: 't', content: 'c', turnstileToken: 'fake-response' },
    });
    expect(res.statusCode).toBe(401);
  });

  test('should reject invisible characters in blog entry', async () => {
    const app = createTestServer({
      auth: { ...emptyAuth(), login: true, userID: createUID },
    });
    await app.register(setup);
    const res = await app.inject({
      method: 'post',
      url: '/blogs',
      payload: { title: 't', content: 'bad\u200Bword', turnstileToken: 'fake-response' },
    });
    expect(res.statusCode).toBe(400);
  });

  test('should reject more than 5 subjectIDs', async () => {
    const app = createTestServer({
      auth: { ...emptyAuth(), login: true, userID: createUID },
    });
    await app.register(setup);
    const res = await app.inject({
      method: 'post',
      url: '/blogs',
      payload: {
        title: 't',
        content: 'c',
        subjectIDs: [1, 2, 3, 4, 5, 6],
        turnstileToken: 'fake-response',
      },
    });
    expect(res.statusCode).toBe(400);
  });

  test('should update own blog entry', async () => {
    const app = createTestServer({
      auth: { ...emptyAuth(), login: true, userID: updateUID },
    });
    await app.register(setup);

    const createRes = await app.inject({
      method: 'post',
      url: '/blogs',
      payload: { title: 'Original', content: 'original content', turnstileToken: 'fake-response' },
    });
    expect(createRes.statusCode).toBe(200);
    createdEntryID = createRes.json().id;

    const res = await app.inject({
      method: 'patch',
      url: `/blogs/${createdEntryID}`,
      payload: { title: 'Updated', content: 'updated content' },
    });
    expect(res.statusCode).toBe(200);

    const [entry] = await db
      .select()
      .from(schema.chiiBlogEntries)
      .where(op.eq(schema.chiiBlogEntries.id, createdEntryID!));
    expect(entry?.title).toBe('Updated');
    expect(entry?.content).toBe('updated content');
  });

  test('should not update blog entry of others', async () => {
    const app = createTestServer({
      auth: { ...emptyAuth(), login: true, userID: otherUID },
    });
    await app.register(setup);
    const res = await app.inject({
      method: 'patch',
      url: '/blogs/319484',
      payload: { title: 'hacked' },
    });
    expect(res.statusCode).toBe(403);
  });

  test('should return 404 for non-existent blog entry on update', async () => {
    const app = createTestServer({
      auth: { ...emptyAuth(), login: true, userID: createUID },
    });
    await app.register(setup);
    const res = await app.inject({
      method: 'patch',
      url: '/blogs/999999',
      payload: { title: 't' },
    });
    expect(res.statusCode).toBe(404);
  });

  test('should reject empty patch', async () => {
    const app = createTestServer({
      auth: { ...emptyAuth(), login: true, userID: emptyPatchUID },
    });
    await app.register(setup);

    const createRes = await app.inject({
      method: 'post',
      url: '/blogs',
      payload: { title: 't', content: 'c', turnstileToken: 'fake-response' },
    });
    expect(createRes.statusCode).toBe(200);
    createdEntryID = createRes.json().id;

    const res = await app.inject({
      method: 'patch',
      url: `/blogs/${createdEntryID}`,
      payload: {},
    });
    expect(res.statusCode).toBe(400);
  });

  test('should delete own blog entry and cascade', async () => {
    const app = createTestServer({
      auth: { ...emptyAuth(), login: true, userID: deleteUID },
    });
    await app.register(setup);

    const createRes = await app.inject({
      method: 'post',
      url: '/blogs',
      payload: {
        title: 'To Delete',
        content: 'content',
        tags: ['blog-test-tag'],
        subjectIDs: [12],
        turnstileToken: 'fake-response',
      },
    });
    expect(createRes.statusCode).toBe(200);
    createdEntryID = createRes.json().id;
    const id = createdEntryID!;

    // 模拟评论、照片与时间线
    await db.insert(schema.chiiBlogComments).values({
      mid: id,
      uid: deleteUID,
      related: 0,
      createdAt: 1639569404,
      content: 'comment',
    });
    await db.insert(schema.chiiBlogPhotos).values({
      eid: id,
      uid: deleteUID,
      target: 'test.jpg',
      vote: 0,
      createdAt: 1639569404,
    });
    await db.insert(schema.chiiTimeline).values({
      uid: deleteUID,
      cat: 6,
      type: 1,
      related: id.toString(),
      memo: '{}',
      img: '',
      batch: false,
      source: 0,
      replies: 0,
      createdAt: 1639569404,
    });

    const res = await app.inject({
      method: 'delete',
      url: `/blogs/${id}`,
    });
    expect(res.statusCode).toBe(200);

    const [entry] = await db
      .select()
      .from(schema.chiiBlogEntries)
      .where(op.eq(schema.chiiBlogEntries.id, id));
    expect(entry).toBeUndefined();
    const comments = await db
      .select()
      .from(schema.chiiBlogComments)
      .where(op.eq(schema.chiiBlogComments.mid, id));
    expect(comments).toHaveLength(0);
    const relatedBlogs = await db
      .select()
      .from(schema.chiiSubjectRelatedBlogs)
      .where(op.eq(schema.chiiSubjectRelatedBlogs.entryID, id));
    expect(relatedBlogs).toHaveLength(0);
    const photos = await db
      .select()
      .from(schema.chiiBlogPhotos)
      .where(op.eq(schema.chiiBlogPhotos.eid, id));
    expect(photos).toHaveLength(0);
    const tagList = await db
      .select()
      .from(schema.chiiTagList)
      .where(
        op.and(op.eq(schema.chiiTagList.userID, deleteUID), op.eq(schema.chiiTagList.mainID, id)),
      );
    expect(tagList).toHaveLength(0);
    const timelines = await db
      .select()
      .from(schema.chiiTimeline)
      .where(
        op.and(
          op.eq(schema.chiiTimeline.uid, deleteUID),
          op.eq(schema.chiiTimeline.related, id.toString()),
        ),
      );
    expect(timelines).toHaveLength(0);
  });

  test('should not delete blog entry of others', async () => {
    const app = createTestServer({
      auth: { ...emptyAuth(), login: true, userID: otherUID },
    });
    await app.register(setup);
    const res = await app.inject({
      method: 'delete',
      url: '/blogs/319484',
    });
    expect(res.statusCode).toBe(403);
  });
});
