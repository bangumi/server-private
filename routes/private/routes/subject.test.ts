import { describe, expect, test } from 'vitest';

import type { IAuth } from '@app/lib/auth/index.ts';
import { emptyAuth, UserGroup } from '@app/lib/auth/index.ts';
import { createTestServer } from '@app/tests/utils.ts';
import * as res from '@app/lib/types/res.ts';

import { setup } from './subject.ts';

describe('subject', () => {
  test('should get subject', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/subjects/12',
    });
    expect(res.json()).toMatchSnapshot();
  });

  test('should get subject episodes', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/subjects/12/episodes',
      query: { limit: '2', offset: '0' },
    });
    expect(res.json()).toMatchSnapshot();
  });

  test('should get subject relations', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/subjects/12/relations',
      query: { limit: '2', offset: '0' },
    });
    expect(res.json()).toMatchSnapshot();
  });

  test('should get subject characters', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/subjects/12/characters',
      query: { limit: '2', offset: '0' },
    });
    expect(res.json()).toMatchSnapshot();
  });

  test('should get subject staffs', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/subjects/12/staffs',
      query: { limit: '2', offset: '0' },
    });
    expect(res.json()).toMatchSnapshot();
  });

  test('should get subject recs', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/subjects/12/recs',
      query: { limit: '2', offset: '0' },
    });
    expect(res.json()).toMatchSnapshot();
  });

  test('should get subject comments', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/subjects/12/comments',
      query: { limit: '2', offset: '0' },
    });
    expect(res.json()).toMatchSnapshot();
  });

  test('should get subject reviews', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/subjects/184017/reviews',
      query: { limit: '2', offset: '0' },
    });
    expect(res.json()).toMatchSnapshot();
  });

  test('should get subject topics', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/subjects/12/topics',
      query: { limit: '2', offset: '0' },
    });
    expect(res.json()).toMatchSnapshot();
  });

  test('should create and edit topic', async () => {
    const app = createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        userID: 2,
      },
    });
    await app.register(setup);

    const title = 'new topic title';
    const text = 'new contents';

    const res = await app.inject({
      url: '/subjects/12/topics',
      method: 'post',
      payload: {
        title: title,
        text: text,
        'cf-turnstile-response': 'fake-response',
      },
    });
    expect(res.statusCode).toBe(200);
    const result = res.json() as { id: number };
    expect(result.id).toBeDefined();
    const res2 = await app.inject({
      url: `/subjects/-/topics/${result.id}`,
      method: 'get',
    });
    expect(res2.statusCode).toBe(200);
    const result2 = res2.json() as res.ITopicDetail;
    expect(result2.title).toBe(title);
    expect(result2.text).toBe(text);

    const title2 = 'new topic title 2';
    const text2 = 'new contents 2';

    const res3 = await app.inject({
      url: `/subjects/-/topics/${result.id}`,
      method: 'put',
      payload: {
        title: title2,
        text: text2,
      },
    });
    expect(res3.statusCode).toBe(200);

    const res4 = await app.inject({
      url: `/subjects/-/topics/${result.id}`,
      method: 'get',
    });
    expect(res4.statusCode).toBe(200);
    const result4 = res4.json() as res.ITopicDetail;
    expect(result4.title).toBe(title2);
    expect(result4.text).toBe(text2);
  });

  test('should not edited topic by non-owner', async () => {
    const app = createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        userID: 1,
      },
    });
    app.register(setup);
    const res = await app.inject({
      url: '/subjects/-/topics/6873',
      method: 'put',
      payload: {
        title: 'new topic title',
        text: 'new contents',
      },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchSnapshot();
  });
});
