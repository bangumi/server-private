import { test, expect, beforeEach } from 'vitest';

import { emptyAuth } from '@app/lib/auth';
import * as orm from '@app/lib/orm';
import { createTestServer } from '@app/tests/utils';

import { setup } from './post';

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
      content: 'before-test',
    },
  );
});

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
