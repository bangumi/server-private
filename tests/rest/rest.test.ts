import { describe, test, expect } from '@jest/globals';
import { fastify } from 'fastify';

import { setup } from '../../lib/rest';

describe('rest', () => {
  const app = setup(fastify());

  test('should return null user', async () => {
    const res = await app.inject({
      url: '/me',
    });

    expect(res.json()).toEqual({ data: undefined });
    expect(res.statusCode).toBe(200);
  });

  test('should return current user', async () => {
    const res = await app.inject({
      url: '/me',
      headers: { authorization: 'Bearer a_development_access_token' },
    });

    expect(res.json()).toEqual({ data: { ID: 382951, username: '382951', nickname: '树洞酱' } });
    expect(res.statusCode).toBe(200);
  });
});
