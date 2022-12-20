import dayjs from 'dayjs';
import { beforeEach, expect, test, afterEach } from 'vitest';

import { createTestServer } from '../../../../tests/utils';
import { emptyAuth } from '../../../auth';
import * as Notify from '../../../notify';
import { NotifyFieldRepo, NotifyRepo } from '../../../orm';
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
    now: dayjs(),
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
