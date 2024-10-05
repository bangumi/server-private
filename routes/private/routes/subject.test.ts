import { beforeEach, describe, expect, test, vi } from 'vitest';

import { emptyAuth } from '@app/lib/auth/index.ts';
import * as orm from '@app/lib/orm/index.ts';
import { createTestServer } from '@app/tests/utils.ts';

import { setup } from './post.ts';

const expectedEpComment = {
  id: 1569792,
  epID: 1075440,
  creatorID: 448570,
  relatedID: 0,
  createdAt: 1719389390,
  content: '这是一条测试内容',
  state: 0,
  user: {
    avatar: {
      large: 'https://lain.bgm.tv/pic/user/l/000/38/29/382951.jpg?r=1571167246',
      medium: 'https://lain.bgm.tv/pic/user/m/000/38/29/382951.jpg?r=1571167246',
      small: 'https://lain.bgm.tv/pic/user/s/000/38/29/382951.jpg?r=1571167246',
    },
    id: 382951,
    nickname: '树洞酱',
    sign: 'treeholechan@gmail.com 密码:lovemeplease',
    user_group: 0,
    username: '382951',
  },
  replies: [],
};

beforeEach(async () => {
  await orm.EpisodeCommentRepo.update(
    {
      id: 1569874,
    },
    {
      state: 0,
      content: 'before-test',
    },
  );
});

async function testServer(...arg: Parameters<typeof createTestServer>) {
  const app = createTestServer(...arg);

  await app.register(setup);
  return app;
}

describe('get ep comment', () => {
  test('not found', async () => {
    const app = await testServer();
    const res = await app.inject({
      url: '/subjects/-/episode/114514/comments',
      method: 'get',
    });
    expect(JSON.parse(res.body)).toEqual([]);
  });

  test('ok', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({ method: 'get', url: '/subjects/-/episode/1075440/comments' });
    expect(res.json()).toContainEqual(expectedEpComment);
  });
});

describe('create ep comment', () => {
  test('not allowed not login', async () => {
    const app = await testServer();
    const res = await app.inject({
      url: '/subjects/-/episode/1075440/comments',
      method: 'post',
      payload: { content: '114514', 'cf-turnstile-response': 'fake-response' },
    });
    expect(res.statusCode).toBe(401);
  });

  test('ok', async () => {
    const app = createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        userID: 2,
      },
    });
    await app.register(setup);
    const res = await app.inject({
      url: '/subjects/-/episode/1075440/comments',
      method: 'post',
      payload: { content: '114514', 'cf-turnstile-response': 'fake-response' },
    });
    const pst = await orm.EpisodeCommentRepo.findOneBy({
      id: res.json().id,
    });
    expect(pst?.content).toBe('114514');
  });
});

describe('edit ep comment', () => {
  test('should edit ep comment', async () => {
    const app = createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        userID: 448570,
      },
    });

    await app.register(setup);

    const res = await app.inject({
      url: '/subjects/-/episode/-/comments/1569874',
      method: 'put',
      payload: { content: 'new comment' },
    });

    expect(res.statusCode).toBe(200);

    const pst = await orm.EpisodeCommentRepo.findOneBy({
      id: 1569874,
    });

    expect(pst?.content).toBe('new comment');
  });

  test('should not edit ep comment', async () => {
    const app = createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        userID: 448570 + 1,
      },
    });

    await app.register(setup);

    const res = await app.inject({
      url: '/subjects/-/episode/-/comments/1569874',
      method: 'put',
      payload: { content: 'new comment again' },
    });

    expect(res.json()).toMatchInlineSnapshot(`
      Object {
        "code": "NOT_ALLOWED",
        "error": "Unauthorized",
        "message": "you don't have permission to edit a comment which is not yours",
        "statusCode": 401,
      }
    `);
    expect(res.statusCode).toBe(401);
  });
});

describe('delete ep comment', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  test('not found', async () => {
    const app = await testServer({ auth: { login: true, userID: 2 } });
    const res = await app.inject({
      url: '/subjects/-/episode/-/comments/114514',
      method: 'delete',
    });

    expect(res.statusCode).toBe(404);
  });

  test('not allowed not login', async () => {
    const app = await testServer();
    const res = await app.inject({
      url: '/subjects/-/episode/-/comments/114514',
      method: 'delete',
    });

    expect(res.json()).toMatchSnapshot();
    expect(res.statusCode).toBe(401);
  });

  test('not allowed wrong user', async () => {
    const app = await testServer({ auth: { login: true, userID: 1122 } });
    const res = await app.inject({
      url: '/subjects/-/episode/-/comments/1569874',
      method: 'delete',
    });

    expect(res.json()).toMatchSnapshot();
    expect(res.statusCode).toBe(401);
  });

  test('ok', async () => {
    const app = await testServer({ auth: { login: true, userID: 448570 } });

    const res = await app.inject({
      method: 'delete',
      url: '/subjects/-/episode/-/comments/1569874',
    });
    expect(res.json()).toMatchSnapshot();
    expect(res.statusCode).toBe(200);
  });
});
