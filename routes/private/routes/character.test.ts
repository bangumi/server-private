import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { db, op, schema } from '@app/drizzle';
import { emptyAuth } from '@app/lib/auth/index.ts';
import redis from '@app/lib/redis.ts';
import { createTestServer } from '@app/tests/utils.ts';

import { setup } from './character.ts';

describe('character', () => {
  test('should get character', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/characters/32',
    });
    expect(res.json()).toMatchSnapshot();
  });

  test('should get character with collectedAt', async () => {
    const app = createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        userID: 6162,
      },
    });
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/characters/32',
    });
    expect(res.statusCode).toBe(200);
    const character = res.json();
    expect(character.collectedAt).toEqual(1296496277);
  });

  test('should get character casts', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/characters/32/casts',
      query: { limit: '2', offset: '0' },
    });
    expect(res.json()).toMatchSnapshot();
  });

  test('should get character collects', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/characters/32/collects',
      query: { limit: '2', offset: '0' },
    });
    expect(res.json()).toMatchSnapshot();
  });

  test('should get character indexes', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/characters/32/indexes',
      query: { limit: '2', offset: '0' },
    });
    expect(res.json()).toMatchSnapshot();
  });
});

describe('character photos', () => {
  const photoID = 9800001;
  const spoilerPhotoID = 9800002;
  const commentID = 9800010;

  beforeEach(async () => {
    await redis.flushdb();
    await db
      .delete(schema.chiiSubjectPhotos)
      .where(op.inArray(schema.chiiSubjectPhotos.id, [photoID, spoilerPhotoID]));
    await db.delete(schema.chiiCrtComments).where(op.eq(schema.chiiCrtComments.mid, 32));
    await db.insert(schema.chiiSubjectPhotos).values([
      {
        id: photoID,
        type: 1,
        mid: 32,
        uid: 287622,
        target: 'ce/65/32_test.jpg',
        title: 'Character photo',
        comment: 'A public character photo',
        tags: 'character test',
        spoiler: false,
        createdAt: 1718275200,
        updatedAt: 1718275201,
        lastPost: 1718275202,
        ban: false,
      },
      {
        id: spoilerPhotoID,
        type: 1,
        mid: 32,
        uid: 287622,
        target: 'ce/65/32_spoiler.jpg',
        title: 'Spoiler photo',
        comment: 'A spoiler character photo',
        tags: '',
        spoiler: true,
        createdAt: 1718275300,
        updatedAt: 1718275301,
        lastPost: 1718275302,
        ban: false,
      },
    ]);
    await db.insert(schema.chiiCrtComments).values([
      {
        id: commentID,
        mid: 32,
        content: 'character photo comment',
        state: 0,
        createdAt: 1718275400,
        uid: 287622,
        related: 0,
        relatedPhotoID: photoID,
      },
      {
        id: commentID + 1,
        mid: 32,
        content: 'regular character comment',
        state: 0,
        createdAt: 1718275401,
        uid: 287622,
        related: 0,
        relatedPhotoID: 0,
      },
    ]);
  });

  afterEach(async () => {
    await redis.flushdb();
    await db.delete(schema.chiiCrtComments).where(op.eq(schema.chiiCrtComments.mid, 32));
    await db
      .delete(schema.chiiSubjectPhotos)
      .where(op.inArray(schema.chiiSubjectPhotos.id, [photoID, spoilerPhotoID]));
    await db
      .update(schema.chiiCharacters)
      .set({
        comment: 56,
      })
      .where(op.eq(schema.chiiCharacters.id, 32));
  });

  test('should get character photo preview without spoiler photos', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/characters/32/photos/preview',
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.total).toBe(1);
    expect(body.data).toHaveLength(1);
    expect(body.data[0]).toMatchObject({
      id: photoID,
      type: 1,
      mainID: 32,
      title: 'Character photo',
      tags: ['character', 'test'],
      spoiler: false,
    });
    expect(body.data[0].images.large).toBe(
      'https://lain.bgm.tv/pic/photos/character/l/ce/65/32_test.jpg',
    );
  });

  test('should get character photo list and detail', async () => {
    const app = createTestServer();
    await app.register(setup);
    const list = await app.inject({
      method: 'get',
      url: '/characters/32/photos',
      query: { limit: '10', offset: '0' },
    });
    expect(list.statusCode).toBe(200);
    expect(list.json().total).toBe(2);

    const detail = await app.inject({
      method: 'get',
      url: `/characters/32/photos/${photoID}`,
    });
    expect(detail.statusCode).toBe(200);
    expect(detail.json()).toMatchObject({
      id: photoID,
      creatorID: 287622,
      comment: 'A public character photo',
    });
  });

  test('should get and create character photo comments', async () => {
    const app = createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        userID: 287622,
      },
    });
    await app.register(setup);
    const list = await app.inject({
      method: 'get',
      url: `/characters/32/photos/${photoID}/comments`,
    });
    expect(list.statusCode).toBe(200);
    expect(list.json()).toHaveLength(1);
    expect(list.json()[0]).toMatchObject({
      id: commentID,
      relatedPhotoID: photoID,
      content: 'character photo comment',
    });

    const created = await app.inject({
      method: 'post',
      url: `/characters/32/photos/${photoID}/comments`,
      payload: { content: 'new character photo comment', turnstileToken: 'fake-response' },
    });
    expect(created.statusCode).toBe(200);
    const [comment] = await db
      .select()
      .from(schema.chiiCrtComments)
      .where(op.eq(schema.chiiCrtComments.id, created.json().id));
    expect(comment?.relatedPhotoID).toBe(photoID);
  });
});
