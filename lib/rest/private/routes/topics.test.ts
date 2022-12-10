import { describe, expect, test } from 'vitest';

import { createServer } from '../../../server';

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
});
