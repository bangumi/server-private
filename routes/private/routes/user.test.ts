import { DateTime } from 'luxon';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { emptyAuth } from '@app/lib/auth/index.ts';
import * as Notify from '@app/lib/notify.ts';
import { NotifyFieldRepo, NotifyRepo } from '@app/lib/orm/index.ts';
import { createTestServer } from '@app/tests/utils.ts';

import { setup } from './user.ts';

describe('notify', () => {
  beforeEach(async () => {
    await NotifyRepo.delete({});
    await NotifyFieldRepo.delete({});
  });

  afterEach(async () => {
    await NotifyRepo.delete({});
    await NotifyFieldRepo.delete({});
  });

  test('should list notify', async () => {
    await Notify.create({
      destUserID: 287622,
      sourceUserID: 382951,
      topicID: 2,
      now: DateTime.now(),
      type: Notify.Type.GroupTopicReply,
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

describe('user', () => {
  test('should get friends', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/users/287622/friends',
      query: { limit: '1', offset: '0' },
    });
    expect(res.json()).toMatchSnapshot();
  });
});
