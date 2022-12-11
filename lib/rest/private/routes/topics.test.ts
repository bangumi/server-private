import { fastify } from 'fastify';
import { describe, expect, test, vi } from 'vitest';

import type { IAuth } from '../../../auth';
import { UserGroup } from '../../../auth';
import * as orm from '../../../orm';
import { createServer } from '../../../server';
import * as topicAPI from './topics';

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

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchSnapshot();
  });

  test('should fetch group profile', async () => {
    const app = await createServer();

    const res = await app.inject('/p1/groups/sandbox/profile');
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchSnapshot();
  });

  test('should fetch topic details', async () => {
    const app = await createServer();

    const res = await app.inject('/p1/groups/-/topics/371602');
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchSnapshot();
  });
});

const createPostInGroup = vi.fn().mockResolvedValue({ id: 1 });
vi.spyOn(orm, 'createPostInGroup').mockImplementation(createPostInGroup);

describe('create group post', () => {
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
