import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { db, op, schema } from '@app/drizzle';
import { emptyAuth } from '@app/lib/auth/index.ts';
import { createTestServer } from '@app/tests/utils.ts';

import { setup } from './timeline.ts';

describe('timeline', () => {
  test('should get friends', async () => {
    const app = createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        userID: 287622,
      },
    });

    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/timeline',
      query: { mode: 'friends' },
    });
    expect(res.json()).toMatchSnapshot();
  });
});

describe('timeline status', () => {
  beforeEach(async () => {
    await db
      .delete(schema.chiiTimeline)
      .where(op.and(op.eq(schema.chiiTimeline.uid, 287622), op.eq(schema.chiiTimeline.cat, 5)));
  });

  afterEach(async () => {
    await db
      .delete(schema.chiiTimeline)
      .where(op.and(op.eq(schema.chiiTimeline.uid, 287622), op.eq(schema.chiiTimeline.cat, 5)));
  });

  test('should create timeline say', async () => {
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
      url: '/timeline',
      body: { content: '^_^\n(bgm38)>_<', turnstileToken: 'fake' },
    });
    expect(res.statusCode).toBe(200);
    const id = res.json().id;

    const [data] = await db
      .select()
      .from(schema.chiiTimeline)
      .where(op.eq(schema.chiiTimeline.id, id))
      .limit(1);
    expect(data).toBeDefined();
    expect(data?.cat).toBe(5);
    expect(data?.type).toBe(1);
    expect(data?.memo).toBe('^_^\n(bgm38)&gt;_&lt;');
  });
});
