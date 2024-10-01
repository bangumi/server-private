import formBody from '@fastify/formbody';
import { describe, expect, test } from 'vitest';

import { db, op } from '@app/drizzle/db';
import { chiiAccessToken, chiiOAuthRefreshToken } from '@app/drizzle/schema';
import { fetchUserX } from '@app/lib/orm';
import * as res from '@app/lib/types/res.ts';
import { userOauthRoutes } from '@app/routes/oauth/index.ts';
import { createTestServer } from '@app/tests/utils.ts';
import fastifyCookie from '@fastify/cookie';
import * as cheerio from 'cheerio';

const createApp = async () => {
  const app = createTestServer({
    auth: { login: true, userID: 4 },
  });
  app.addHook('preHandler', async function (req, reply) {
    if (req.auth.login) {
      const user = res.toResUser(await fetchUserX(req.auth.userID));
      reply.locals = { user };
    }
  });

  await app.register(formBody);
  await app.register(fastifyCookie, { secret: 'hello world' });
  await app.register(userOauthRoutes);

  return app;
};

describe('oauth', () => {
  const clientID = 'bgmabcdefg';
  const redirectUri = 'bangumi://oauth/callback';
  const clientSecret = 'abcdefg';

  test('should return 200', async () => {
    const app = await createApp();

    const res = await app.inject({
      url: '/authorize',
      query: {
        client_id: clientID,
        response_type: 'code',
        redirect_uri: redirectUri,
        state: '233',
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toMatchInlineSnapshot(`"text/html; charset=utf-8"`);

    const $ = cheerio.load(res.body);
    const csrfToken = $('input[name="csrf_token"]').val() as string;

    const res2 = await app.inject({
      url: '/authorize',
      method: 'post',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        cookie: `csrf-secret=${res.cookies.find((c) => c.name === 'csrf-secret')?.value}`,
      },
      payload: new URLSearchParams({
        client_id: 'bgmabcdefg',
        csrf_token: csrfToken,
        redirect_uri: 'bangumi://oauth/callback',
      }).toString(),
    });

    expect(res2.body).toMatchInlineSnapshot(`""`);
    expect(res2.statusCode).toBe(302);
    const u = new URL(res2.headers.location as string);
    expect(u.protocol).toMatchInlineSnapshot(`"bangumi:"`);
    expect(u.hostname).toMatchInlineSnapshot(`"oauth"`);
    expect(u.pathname).toMatchInlineSnapshot(`"/callback"`);
    expect(u.searchParams.get('state')).toMatchInlineSnapshot(`null`);

    const code = u.searchParams.get('code') as string;

    const fetch_token = await app.inject({
      url: '/access_token',
      method: 'post',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      payload: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: clientID,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }).toString(),
    });

    expect(fetch_token.statusCode).toBe(200);

    const data: { access_token: string; refresh_token: string } = fetch_token.json();
    expect(data).toMatchObject({
      access_token: expect.any(String),
      expires_in: expect.any(Number),
      refresh_token: expect.any(String),
      token_type: 'Bearer',
      user_id: expect.any(String),
    });

    const tokens = await db
      .select()
      .from(chiiAccessToken)
      .where(
        op.and(
          op.eq(chiiAccessToken.accessToken, data.access_token),
          op.gt(chiiAccessToken.expiredAt, new Date()),
        ),
      );
    expect(tokens.length).toBe(1);

    const refreshTokens = await db
      .select()
      .from(chiiOAuthRefreshToken)
      .where(
        op.and(
          op.eq(chiiOAuthRefreshToken.refreshToken, data.refresh_token),
          op.gt(chiiOAuthRefreshToken.expiredAt, new Date()),
        ),
      );

    expect(refreshTokens.length).toBe(1);

    const refreshTokenResult = await app.inject({
      url: '/access_token',
      method: 'post',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      payload: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientID,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        refresh_token: data.refresh_token,
      }).toString(),
    });

    expect(refreshTokenResult.json()).toMatchObject({
      access_token: expect.any(String),
      expires_in: expect.any(Number),
      refresh_token: expect.any(String),
      token_type: 'Bearer',
      user_id: expect.any(String),
    });
    expect(refreshTokenResult.statusCode).toBe(200);

    await expect(
      db
        .select()
        .from(chiiAccessToken)
        .where(
          op.and(
            op.eq(chiiAccessToken.accessToken, refreshTokenResult.json().access_token as string),
            op.gt(chiiAccessToken.expiredAt, new Date()),
          ),
        ),
    ).resolves.toHaveLength(1);
  });
});
