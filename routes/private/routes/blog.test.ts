import { describe, expect, test } from 'vitest';

import { emptyAuth } from '@app/lib/auth/index.ts';
import { createTestServer } from '@app/tests/utils.ts';

import { setup } from './blog.ts';

describe('blog', () => {
  const testUID = 287622;
  const publicEntryID = 319484;
  const privateEntryID = 319486;

  test('should get blog entry', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: `/blogs/${publicEntryID}`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchSnapshot();
  });

  test('should not get private blog entry from other user', async () => {
    const app = createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        userID: testUID + 1, // different user
      },
    });
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: `/blogs/${privateEntryID}`,
    });
    expect(res.statusCode).toBe(404);
  });

  test('should get private blog entry from friend', async () => {
    const app = createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        userID: 427613, // friend
      },
    });
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: `/blogs/${privateEntryID}`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchSnapshot();
  });

  test('should get private blog entry from self', async () => {
    const app = createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        userID: testUID, // same user
      },
    });
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: `/blogs/${privateEntryID}`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchSnapshot();
  });

  test('should get blog related subjects', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: `/blogs/${publicEntryID}/subjects`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchSnapshot();
  });

  test('should get blog photos', async () => {
    const app = createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        userID: testUID, // same user
      },
    });
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: `/blogs/${publicEntryID}/photos`,
      query: { limit: '2', offset: '0' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchSnapshot();
  });

  test('should not get blog photos from other user', async () => {
    const app = createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        userID: testUID + 1, // other user
      },
    });
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: `/blogs/${privateEntryID}/photos`,
    });
    expect(res.statusCode).toBe(404);
  });
});
