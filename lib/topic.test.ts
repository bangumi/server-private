import { test, vi, expect, afterAll, afterEach } from 'vitest';

import prisma from './prisma';
import * as Topic from './topic';

const transaction = vi.fn().mockResolvedValue({
  id: 2,
  uid: 1,
});

vi.spyOn(prisma, '$transaction').mockImplementation(transaction);

afterEach(() => {
  transaction.mockReset();
});

afterAll(() => {
  vi.resetModules();
});

test('create topic reply', async () => {
  const r = await Topic.createTopicReply({
    type: Topic.Type.group,
    topicID: 10,
    content: 'c',
    userID: 1,
    state: Topic.ReplyState.Normal,
    relatedID: 0,
  });

  expect(transaction).toBeCalledTimes(1);
  expect(r).matchSnapshot();
});
