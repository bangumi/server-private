import { describe, test, expect } from '@jest/globals';

import { createServer } from '../../lib/server';

describe('rest', () => {
  test('should return null user', async () => {
    const app = await createServer();

    const res = await app.inject({
      url: '/v0.5/me',
    });

    expect(res.json()).toMatchSnapshot();
    expect(res.statusCode).toBe(401);
  });

  test('should return current user', async () => {
    const app = await createServer();

    const res = await app.inject({
      url: '/v0.5/me',
      headers: { authorization: 'Bearer a_development_access_token' },
    });

    expect(res.json()).toEqual({ data: { ID: 382951, username: '382951', nickname: '树洞酱' } });
    expect(res.statusCode).toBe(200);
  });

  test('should build openapi spec', async () => {
    const app = await createServer();

    const res = await app.inject({
      url: '/v0.5/openapi.json',
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      info: {
        title: 'hello',
      },
    });
  });
});
