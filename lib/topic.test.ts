import { describe, test, vi, expect, afterAll, afterEach } from 'vitest';

import * as Topic from './topic';
import { AppDataSource, GroupPostRepo, GroupTopicRepo, UserRepo } from './torm';

describe('mocked', () => {
  const transaction = vi.fn().mockResolvedValue({
    id: 2,
    uid: 1,
  });

  vi.spyOn(AppDataSource, 'transaction').mockImplementation(transaction);

  afterEach(() => {
    transaction.mockReset();
  });

  afterEach(() => {
    vi.resetModules();
  });

  afterAll(() => {
    vi.restoreAllMocks();
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
});

describe('should create topic reply', () => {
  test('should create topic reply and create notify', async () => {
    /** 这个测试会修改数据库内容，所以不能 match 很多东西 */
    const topicBefore = await GroupTopicRepo.findOneOrFail({ where: { id: 375793 } });
    const notifyBefore = await UserRepo.findOneOrFail({ where: { id: 287622 } });

    const r = await Topic.createTopicReply({
      topicType: Topic.Type.group,
      topicID: 375793,
      content: 'new content for testing',
      userID: 1,
      state: Topic.ReplyState.Normal,
    });

    expect(r).toEqual(
      expect.objectContaining({
        user: expect.objectContaining({
          id: 1,
        }),
      }),
    );

    const topicAfter = await GroupTopicRepo.findOneOrFail({ where: { id: 375793 } });
    const notifyAfter = await UserRepo.findOneOrFail({ where: { id: 287622 } });
    expect(topicAfter.replies - topicBefore.replies).toBe(1);
    expect(notifyAfter.newNotify - notifyBefore.newNotify).toBe(1);

    const post = await GroupPostRepo.findOneOrFail({ where: { id: r.id } });
    expect(post.content).toBe('new content for testing');
  });
});
