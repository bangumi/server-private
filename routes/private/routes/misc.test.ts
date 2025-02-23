import { DateTime } from 'luxon';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { db, schema } from '@app/drizzle';
import { emptyAuth } from '@app/lib/auth/index.ts';
import { Notify, NotifyType } from '@app/lib/notify.ts';
import { createTestServer } from '@app/tests/utils.ts';

import { setup } from './misc.ts';

describe('notify', () => {
  beforeEach(async () => {
    await db.delete(schema.chiiNotify);
    await db.delete(schema.chiiNotifyField);
  });

  afterEach(async () => {
    await db.delete(schema.chiiNotify);
    await db.delete(schema.chiiNotifyField);
  });

  test('should list notify', async () => {
    await Notify.create({
      destUserID: 287622,
      sourceUserID: 382951,
      topicID: 2,
      now: DateTime.now(),
      type: NotifyType.GroupTopicReply,
      title: 'tt',
      postID: 1,
    });

    const app = await createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        userID: 287622,
      },
    });

    await app.register(setup);
    const res = await app.inject({ url: '/notify' });

    expect(res.statusCode).toBe(200);
    expect(Object.keys(res.json())).toContain('data');
  });
});
