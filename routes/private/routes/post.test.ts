import { DateTime } from 'luxon';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type { IAuth } from '@app/lib/auth/index.ts';
import { emptyAuth, UserGroup } from '@app/lib/auth/index.ts';
import * as Notify from '@app/lib/notify.ts';
import * as orm from '@app/lib/orm/index.ts';
import type { ITopicDetails } from '@app/lib/topic/index.ts';
import { CommentState, TopicDisplay } from '@app/lib/topic/index.ts';
import * as Topic from '@app/lib/topic/index.ts';
import { createTestServer } from '@app/tests/utils.ts';

import { setup } from './post.ts';

/**
 * Topic 375793
 *
 * Reply 2177419 (287622)
 *
 * - Sub-reply 2177420 (287622)
 */

beforeEach(async () => {
  await orm.GroupPostRepo.update(
    {
      id: 2177420,
    },
    {
      state: 0,
      content: 'before-test',
    },
  );
});

describe('get post', () => {
  test('ok', async () => {
    const app = createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        userID: 287622,
      },
    });

    await app.register(setup);

    const res = await app.inject({ method: 'get', url: '/groups/-/posts/2092074' });
    expect(res.json()).toMatchInlineSnapshot(`
      Object {
        "createdAt": 1662283112,
        "creator": Object {
          "avatar": Object {
            "large": "https://lain.bgm.tv/pic/user/l/icon.jpg",
            "medium": "https://lain.bgm.tv/pic/user/m/icon.jpg",
            "small": "https://lain.bgm.tv/pic/user/s/icon.jpg",
          },
          "id": 287622,
          "nickname": "nickname 287622",
          "sign": "sing 287622",
          "user_group": 0,
          "username": "287622",
        },
        "id": 2092074,
        "state": 0,
        "text": "sub",
        "topicID": 371602,
        "topicTitle": "tes",
      }
    `);
  });

  test('not found', async () => {
    const app = createTestServer({});
    await app.register(setup);

    const res = await app.inject({ method: 'get', url: '/groups/-/posts/209207400' });
    expect(res.statusCode).toBe(404);
  });
});

describe('edit post', () => {
  test('should edit post', async () => {
    const app = createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        userID: 287622,
      },
    });

    await app.register(setup);

    const res = await app.inject({
      url: '/groups/-/posts/2177420',
      method: 'put',
      payload: { text: 'new content' },
    });

    expect(res.statusCode).toBe(200);

    const pst = await orm.GroupPostRepo.findOneBy({
      id: 2177420,
    });

    expect(pst?.content).toBe('new content');
  });

  test('should not edit post', async () => {
    const app = createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        userID: 287622 + 1,
      },
    });

    await app.register(setup);

    const res = await app.inject({
      url: '/groups/-/posts/2177420',
      method: 'put',
      payload: { text: 'new content' },
    });

    expect(res.json()).toMatchInlineSnapshot(`
      Object {
        "code": "NOT_ALLOWED",
        "error": "Unauthorized",
        "message": "you don't have permission to edit reply not created by you",
        "statusCode": 401,
      }
    `);
    expect(res.statusCode).toBe(401);
  });

  test('should not edit post with sub-reply', async () => {
    const app = createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        userID: 287622,
      },
    });

    await app.register(setup);

    const res = await app.inject({
      url: '/groups/-/posts/2177419',
      method: 'put',
      payload: { text: 'new content' },
    });

    expect(res.json()).toMatchInlineSnapshot(`
      Object {
        "code": "NOT_ALLOWED",
        "error": "Unauthorized",
        "message": "you don't have permission to edit a reply with sub-reply",
        "statusCode": 401,
      }
    `);
    expect(res.statusCode).toBe(401);
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
          contentPost: { id: 100 },
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

    await app.register(setup);

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

    await app.register(setup);

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

    await app.register(setup);

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

    await app.register(setup);

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

async function testServer(...arg: Parameters<typeof createTestServer>) {
  const app = createTestServer(...arg);

  await app.register(setup);
  return app;
}

describe('delete post', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  test('not found', async () => {
    const app = await testServer({ auth: { login: true, userID: 1 } });
    const res = await app.inject({
      url: '/groups/-/posts/2092074123',
      method: 'delete',
    });

    expect(res.statusCode).toBe(404);
  });

  test('ok', async () => {
    const app = await testServer({ auth: { login: true, userID: 287622 } });

    const res = await app.inject({ method: 'delete', url: '/groups/-/posts/2177420' });
    expect(res.json()).toMatchSnapshot();
    expect(res.statusCode).toBe(200);
  });

  test('not allowed not login', async () => {
    const app = await testServer();
    const res = await app.inject({ url: '/groups/-/posts/2177420', method: 'delete' });

    expect(res.json()).toMatchSnapshot();
    expect(res.statusCode).toBe(401);
  });

  test('not allowed wrong user', async () => {
    const app = await testServer({ auth: { login: true, userID: 1122 } });
    const res = await app.inject({ url: '/groups/-/posts/2177420', method: 'delete' });

    expect(res.json()).toMatchSnapshot();
    expect(res.statusCode).toBe(401);
  });
});
