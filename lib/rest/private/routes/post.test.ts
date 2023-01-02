import { test, expect, beforeEach } from 'vitest';

import { emptyAuth } from '@app/lib/auth';
import * as orm from '@app/lib/orm';
import { createTestServer } from '@app/tests/utils';

import { setup } from './post';

beforeEach(async () => {
  await orm.GroupPostRepo.update(
    {
      id: 2177419,
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
    url: '/groups/-/posts/2177419',
    method: 'put',
    payload: { text: 'new content' },
  });

  expect(res.statusCode).toBe(204);

  const pst = await orm.GroupPostRepo.findOneBy({
    id: 2177419,
  });

  expect(pst?.content).toBe('new content');
});
