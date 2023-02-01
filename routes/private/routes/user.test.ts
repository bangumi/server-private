import { DateTime } from 'luxon';
import { afterEach, beforeEach, expect, test } from 'vitest';

import { emptyAuth } from '@app/lib/auth';
import * as Notify from '@app/lib/notify';
import { NotifyFieldRepo, NotifyRepo } from '@app/lib/orm';
import { createTestServer } from '@app/tests/utils';

import { setup } from './user';

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
