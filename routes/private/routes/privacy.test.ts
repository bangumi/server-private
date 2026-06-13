import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { db, op, schema } from '@app/drizzle';
import { emptyAuth } from '@app/lib/auth/index.ts';
import { createTestServer } from '@app/tests/utils.ts';

import { setup } from './privacy.ts';

const testUserID = 900_001;
const oldRegTime = Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 61;

describe('privacy route', () => {
  beforeEach(async () => {
    await db.delete(schema.chiiUserFields).where(op.eq(schema.chiiUserFields.uid, testUserID));
    await db.insert(schema.chiiUserFields).values({
      uid: testUserID,
      site: '',
      location: '',
      bio: '',
      homepage: '',
      privacy: '{"32":2,"future_key":42,"show_nsfw_subject":1}',
      blocklist: '',
    });
  });

  afterEach(async () => {
    await db.delete(schema.chiiUserFields).where(op.eq(schema.chiiUserFields.uid, testUserID));
  });

  test('should get privacy settings', async () => {
    const app = createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        userID: testUserID,
        regTime: oldRegTime,
      },
    });
    await app.register(setup);

    const res = await app.inject({
      method: 'get',
      url: '/privacy',
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      settings: {
        privateMessage: 'all',
        timelineReply: 'all',
        timelineCollectReply: 'none',
        follow: 'all',
        mentionNotification: 'all',
        commentNotification: 'all',
        friendNotification: 'all',
      },
      preferences: {
        showNsfwSubject: true,
        canSetNsfwSubject: true,
        allowNsfw: true,
      },
    });
  });

  test('should patch privacy settings and preserve unknown keys', async () => {
    const app = createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        userID: testUserID,
        regTime: oldRegTime,
      },
    });
    await app.register(setup);

    const res = await app.inject({
      method: 'patch',
      url: '/privacy',
      payload: {
        settings: {
          privateMessage: 'friends',
          follow: 'none',
        },
        preferences: {
          showNsfwSubject: false,
        },
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      settings: {
        privateMessage: 'friends',
        timelineReply: 'all',
        timelineCollectReply: 'none',
        follow: 'none',
        mentionNotification: 'all',
        commentNotification: 'all',
        friendNotification: 'all',
      },
      preferences: {
        showNsfwSubject: false,
        canSetNsfwSubject: true,
        allowNsfw: false,
      },
    });

    const [field] = await db
      .select({ privacy: schema.chiiUserFields.privacy })
      .from(schema.chiiUserFields)
      .where(op.eq(schema.chiiUserFields.uid, testUserID))
      .limit(1);
    expect(JSON.parse(field?.privacy ?? '')).toEqual({
      1: 1,
      32: 2,
      40: 2,
      future_key: 42,
      show_nsfw_subject: 0,
    });
  });

  test('should reject nsfw preference patch before eligibility', async () => {
    const app = createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        userID: testUserID,
        regTime: Math.floor(Date.now() / 1000),
      },
    });
    await app.register(setup);

    const res = await app.inject({
      method: 'patch',
      url: '/privacy',
      payload: {
        preferences: {
          showNsfwSubject: true,
        },
      },
    });

    expect(res.statusCode).toBe(403);

    const [field] = await db
      .select({ privacy: schema.chiiUserFields.privacy })
      .from(schema.chiiUserFields)
      .where(op.eq(schema.chiiUserFields.uid, testUserID))
      .limit(1);
    expect(field?.privacy).toBe('{"32":2,"future_key":42,"show_nsfw_subject":1}');
  });
});
