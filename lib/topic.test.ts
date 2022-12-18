import { test, vi, expect, afterAll, afterEach } from 'vitest';

import * as Topic from './topic';
import { AppDataSource } from './torm/index';

const transaction = vi.fn().mockResolvedValue({
  id: 2,
  uid: 1,
});

vi.spyOn(AppDataSource, 'transaction').mockImplementation(transaction);

afterEach(() => {
  transaction.mockReset();
});

afterAll(() => {
  vi.resetModules();
});

test('create topic reply', async () => {
  const r = await Topic.createTopicReply({
    topicType: Topic.Type.group,
    topicID: 10,
    content: 'c',
    userID: 1,
    state: Topic.ReplyState.Normal,
    replyTo: 0,
  });

  expect(transaction).toBeCalledTimes(1);
  expect(r).matchSnapshot();
});
