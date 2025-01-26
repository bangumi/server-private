import { beforeEach, describe, expect, test } from 'vitest';

import { db, op } from '@app/drizzle/db.ts';
import * as schema from '@app/drizzle/schema';
import { emptyAuth } from '@app/lib/auth/index.ts';
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

  test('should get subject staffs', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/subjects/12/staffs',
      query: { limit: '2', offset: '0' },
    });
    expect(res.json()).toMatchSnapshot();
  });

  test('should get subject positions', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/subjects/12/positions',
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
  const testTopicID = 6873;
  const testUserID = 382951;

  beforeEach(async () => {
    await db.delete(schema.chiiSubjectTopics).where(op.eq(schema.chiiSubjectTopics.subjectID, 12));
    await db.insert(schema.chiiSubjectTopics).values({
      id: testTopicID,
      subjectID: 12,
      createdAt: 1462335911,
      uid: testUserID,
      title: 'Test Topic',
      state: 0,
      replies: 0,
    });
  });

  test('should get subject topics', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/subjects/12/topics',
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
      url: '/subjects/12/topics',
      method: 'post',
      payload: {
        title: 'New Topic',
        text: 'New Content',
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
        text: 'Updated Content',
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
        text: 'Unauthorized Content',
      },
    });

    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchSnapshot();
  });
});
