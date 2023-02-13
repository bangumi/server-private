import { fastify } from 'fastify';
import { DateTime } from 'luxon';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type { IAuth } from '@app/lib/auth';
import { UserGroup } from '@app/lib/auth';
import * as Notify from '@app/lib/notify';
import * as orm from '@app/lib/orm';
import { createServer } from '@app/lib/server';
import type { ITopicDetails } from '@app/lib/topic';
import * as Topic from '@app/lib/topic';
import { CommentState, TopicDisplay } from '@app/lib/topic';
import { createTestServer } from '@app/tests/utils';

import * as topicAPI from './topic';

const expectedTopic = {
  createdAt: 1657885648,
  creator: {
    avatar: {
      large: 'https://lain.bgm.tv/pic/user/l/icon.jpg',
      medium: 'https://lain.bgm.tv/pic/user/m/icon.jpg',
      small: 'https://lain.bgm.tv/pic/user/s/icon.jpg',
    },
    id: 287622,
    nickname: 'nickname 287622',
    sign: 'sing 287622',
    user_group: 0,
    username: '287622',
  },
  id: 371602,
  parentID: 4215,
  repliesCount: 2,
  title: 'tes',
  updatedAt: 1662283112,
};

describe('group topics', () => {
  test('should failed on not found group', async () => {
    const app = await createServer();

    const res = await app.inject({
      url: '/p1/groups/non-existing/topics',
    });

    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchSnapshot();
  });

  test('should return data', async () => {
    const app = await createServer();

    const res = await app.inject({
      url: '/p1/groups/sandbox/topics',
    });
    const data = res.json();

    expect(res.statusCode).toBe(200);
    expect(data.data).toContainEqual(expectedTopic);
  });

  test('should fetch group profile', async () => {
    const app = await createServer();

    const res = await app.inject('/p1/groups/sandbox/profile');
    const data = res.json();

    expect(res.statusCode).toBe(200);
    expect(data.group).toEqual({
      createdAt: 1531631310,
      description: '[s]非[/s]官方沙盒',
      icon: 'https://lain.bgm.tv/pic/icon/s/000/00/42/4215.jpg?r=1531631345',
      id: 4215,
      name: 'sandbox',
      nsfw: false,
      title: '沙盒',
      totalMembers: 3,
    });
    expect(data.topics).toContainEqual(expectedTopic);
  });

  test('should fetch topic details', async () => {
    const app = await createServer();

    const res = await app.inject('/p1/groups/-/topics/371602');
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchSnapshot();
  });
});

describe('create group post', () => {
  const createPostInGroup = vi.fn().mockResolvedValue({ id: 1 });
  vi.spyOn(orm, 'createPostInGroup').mockImplementation(createPostInGroup);

  test('should create group topic', async () => {
    const app = fastify();

    app.addHook('preHandler', (req, res, done) => {
      req.auth = {
        groupID: UserGroup.Normal,
        login: true,
        permission: {},
        allowNsfw: true,
        regTime: 0,
        userID: 100,
      } satisfies IAuth;
      done();
    });

    await app.register(topicAPI.setup);

    const res = await app.inject({
      url: '/groups/sandbox/topics',
      method: 'post',
      payload: {
        title: 'post title',
        content: 'post contents',
      },
    });

    expect(res.json()).toMatchObject({ id: 1 });
    expect(res.statusCode).toBe(200);
  });

  test('should not create with banned user', async () => {
    const app = fastify();

    app.addHook('preHandler', (req, res, done) => {
      req.auth = {
        groupID: UserGroup.Normal,
        login: true,
        permission: {
          ban_post: true,
        },
        allowNsfw: true,
        regTime: 0,
        userID: 1,
      } satisfies IAuth;
      done();
    });

    await app.register(topicAPI.setup);

    const res = await app.inject({
      url: '/groups/sandbox/topics',
      method: 'post',
      payload: {
        title: 'post title',
        content: 'post contents',
      },
    });

    expect(res.statusCode).toBe(401);
    expect(createPostInGroup).toBeCalledTimes(1);
  });
});

describe('create group post reply', () => {
  const createTopicReply = vi.fn().mockResolvedValue({
    id: 6,
    content: '',
    state: CommentState.Normal,
    createdAt: DateTime.fromISO('2021-10-21').toUnixInteger(),
    type: Topic.Type.group,
    topicID: 371602,
    user: {
      img: '',
      username: 'u',
      groupID: UserGroup.Normal,
      id: 9,
      nickname: 'n',
      regTime: DateTime.fromISO('2008-10-01').toUnixInteger(),
      sign: '',
    },
  });

  const notifyMock = vi.fn();
  beforeEach(() => {
    vi.spyOn(Topic, 'createTopicReply').mockImplementation(createTopicReply);
    vi.spyOn(Notify, 'create').mockImplementation(notifyMock);
    vi.spyOn(Topic, 'fetchDetail').mockImplementationOnce(
      (_: IAuth, type: 'group', id: number): Promise<ITopicDetails | null> => {
        if (id !== 371602) {
          return Promise.resolve(null);
        }

        return Promise.resolve({
          replies: [],
          creatorID: 287622,
          id: id,
          title: 't',
          display: TopicDisplay.Normal,
          createdAt: DateTime.now().toUnixInteger(),
          text: 't',
          state: CommentState.Normal,
          parentID: 1,
        });
      },
    );
  });

  afterEach(() => {
    vi.resetModules();
  });

  test('should create group post reply', async () => {
    const app = createTestServer({
      auth: {
        groupID: UserGroup.Normal,
        login: true,
        permission: {},
        allowNsfw: true,
        regTime: 0,
        userID: 100,
      },
    });

    await app.register(topicAPI.setup);

    const res = await app.inject({
      url: '/groups/-/topics/371602/replies',
      method: 'post',
      payload: {
        content: 'post contents',
      },
    });

    expect(res.json()).toMatchObject({
      creator: {
        avatar: {
          large: 'https://lain.bgm.tv/pic/user/l/icon.jpg',
          medium: 'https://lain.bgm.tv/pic/user/m/icon.jpg',
          small: 'https://lain.bgm.tv/pic/user/s/icon.jpg',
        },
        id: 9,
        nickname: 'n',
        sign: '',
        user_group: 10,
        username: 'u',
      },
      id: 6,
      state: 0,
      text: '',
    });
    expect(res.statusCode).toBe(200);
    expect(notifyMock).toHaveBeenCalledOnce();
    expect(notifyMock).toBeCalledWith(
      expect.objectContaining({
        destUserID: 287622,
        type: Notify.Type.GroupTopicReply,
      }),
    );
  });

  test('should not create with banned user', async () => {
    const app = createTestServer({
      auth: {
        groupID: UserGroup.Normal,
        login: true,
        permission: {
          ban_post: true,
        },
        regTime: 0,
        allowNsfw: true,
        userID: 1,
      },
    });

    await app.register(topicAPI.setup);

    const res = await app.inject({
      url: '/groups/-/topics/371602/replies',
      method: 'post',
      payload: {
        content: 'post contents',
      },
    });

    expect(res.statusCode).toBe(401);
    expect(createTopicReply).toBeCalledTimes(1);
  });

  test('should not create on non-existing topic', async () => {
    const app = createTestServer({
      auth: {
        groupID: UserGroup.Normal,
        login: true,
        permission: {},
        allowNsfw: true,
        regTime: 0,
        userID: 1,
      },
    });

    await app.register(topicAPI.setup);

    const res = await app.inject({
      url: '/groups/-/topics/3716000/replies',
      method: 'post',
      payload: {
        content: 'post contents',
      },
    });

    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchSnapshot();
  });

  test('should not create on non-existing topic reply', async () => {
    const app = createTestServer({
      auth: {
        groupID: UserGroup.Normal,
        login: true,
        permission: {},
        allowNsfw: true,
        regTime: 0,
        userID: 1,
      },
    });

    await app.register(topicAPI.setup);

    const res = await app.inject({
      url: '/groups/-/topics/371602/replies',
      method: 'post',
      payload: {
        content: 'post contents',
        replyTo: 11,
      },
    });

    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchSnapshot();
  });
});
