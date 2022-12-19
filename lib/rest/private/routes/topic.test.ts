import dayjs from 'dayjs';
import { fastify } from 'fastify';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { createTestServer } from '../../../../tests/utils';
import type { IAuth } from '../../../auth';
import { UserGroup } from '../../../auth';
import * as orm from '../../../orm';
import { createServer } from '../../../server';
import * as Topic from '../../../topic';
import { ReplyState } from '../../../topic';
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
    state: ReplyState.Normal,
    createdAt: dayjs('2021-10-21').unix(),
    type: Topic.Type.group,
    topicID: 371602,
    user: {
      img: '',
      username: 'u',
      groupID: UserGroup.Normal,
      id: 9,
      nickname: 'n',
      regTime: dayjs('2008-10-01').unix(),
      sign: '',
    },
  });
  const getPostMock = vi.fn().mockResolvedValue({
    id: 6,
    content: '',
    state: ReplyState.Normal,
    createdAt: dayjs('2021-10-21').unix(),
    type: Topic.Type.group,
    topicID: 371602,
    user: {
      img: '',
      username: 'u',
      groupID: UserGroup.Normal,
      id: 9,
      nickname: 'n',
      regTime: dayjs('2008-10-01').unix(),
      sign: '',
    },
  });

  beforeEach(() => {
    vi.spyOn(Topic, 'getPost').mockImplementation(getPostMock);
    vi.spyOn(Topic, 'createTopicReply').mockImplementation(createTopicReply);
    vi.spyOn(orm, 'fetchTopicDetails').mockImplementationOnce(
      (type: 'group', id: number): ReturnType<typeof orm['fetchTopicDetails']> => {
        if (id !== 371602) {
          return Promise.resolve(null);
        }

        return Promise.resolve({
          replies: [],
          creatorID: 0,
          id: id,
          title: 't',
          createdAt: dayjs().unix(),
          text: 't',
          state: ReplyState.Normal,
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

    expect(res.statusCode).toBe(200);
  });

  test('should not create with banned user', async () => {
    const app = createTestServer({
      auth: {
        groupID: UserGroup.Normal,
        login: true,
        permission: {
          ban_post: true,
        },
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
