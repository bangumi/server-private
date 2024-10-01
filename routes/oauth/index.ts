import Cookie from '@fastify/cookie';
import CSRF from '@fastify/csrf';
import { createError } from '@fastify/error';
import formBody from '@fastify/formbody';
import type { Static } from '@sinclair/typebox';
import { Type as t } from '@sinclair/typebox';
import { StatusCodes } from 'http-status-codes';
import { DateTime, Duration } from 'luxon';

import { db, op } from '@app/drizzle/db.ts';
import {
  chiiAccessToken,
  chiiApp,
  chiiOauthClients,
  chiiOAuthRefreshToken,
  chiiUser,
} from '@app/drizzle/schema.ts';
import { NeedLoginError } from '@app/lib/auth/index.ts';
import { cookiesPluginOption } from '@app/lib/auth/session.ts';
import config, { redisOauthPrefix } from '@app/lib/config.ts';
import { BadRequestError } from '@app/lib/error.ts';
import { fetchUserX } from '@app/lib/orm/index.ts';
import redis from '@app/lib/redis.ts';
import * as res from '@app/lib/types/res.ts';
import { randomBase62String, randomBase64url } from '@app/lib/utils/index.ts';
import { Auth } from '@app/routes/hooks/pre-handler.ts';
import type { App } from '@app/routes/type.ts';

// valid in 2 weeks
const ACCESS_TOKEN_TTL_SECONDS = 1209600;
// refresh in 3 month
const REFRESH_TOKEN_TTL_SECONDS = 8035200;

export const enum TokenType {
  OauthToken = 0,
  AccessToken = 1,
}

interface TokenInfo {
  created_at: string; // RFC3339 string
  name: string;
}

const TokenResponse = t.Object(
  {
    access_token: t.String(),
    expires_in: t.Number(),
    token_type: t.String(),
    scope: t.Optional(t.String()),
    refresh_token: t.String(),
    user_id: t.String(),
  },
  { $id: 'TokenResponse' },
);
type ITokenResponse = Static<typeof TokenResponse>;

const AppNonexistenceError = createError<[]>(
  'APP_NONEXISTENCE',
  `App does not exist`,
  StatusCodes.NOT_FOUND,
);
const InvalidResponseTypeError = createError<[]>(
  'INVALID_RESPONSE_TYPE',
  `Invalid response type`,
  StatusCodes.BAD_REQUEST,
);
const RedirectUriMismatchError = createError<[]>(
  'REDIRECT_URI_MISMATCH',
  `Redirect URI mismatch`,
  StatusCodes.BAD_REQUEST,
);
const AppCreatorNonexsistenceError = createError<[]>(
  'APP_CREATOR_NONEXISTENCE',
  `App creator does not exist`,
  StatusCodes.NOT_FOUND,
);
const MissingAuthorizationCodeError = createError<[]>(
  'MISSING_AUTHORIZATION_CODE',
  `Authorization code is missing`,
  StatusCodes.BAD_REQUEST,
);
const MissingRefreshTokenError = createError<[]>(
  'MISSING_REFRESH_TOKEN',
  `Refresh token is missing`,
  StatusCodes.BAD_REQUEST,
);
const InvalidGrantTypeError = createError<[]>(
  'INVALID_GRANT_TYPE',
  `Invalid grant type`,
  StatusCodes.BAD_REQUEST,
);
const InvalidClientSecretError = createError<[]>(
  'INVALID_CLIENT_SECRET',
  `Invalid client secret`,
  StatusCodes.BAD_REQUEST,
);
const InvalidAuthorizationCodeError = createError<[]>(
  'INVALID_AUTHORIZATION_CODE',
  `Invalid authorization code`,
  StatusCodes.BAD_REQUEST,
);
const InvalidRefreshTokenError = createError<[]>(
  'INVALID_REFRESH_TOKEN',
  `Invalid refresh token or expired`,
  StatusCodes.BAD_REQUEST,
);
const InvalidClientIDError = createError<[]>(
  'INVALID_CLIENT_ID',
  `Invalid client ID`,
  StatusCodes.BAD_REQUEST,
);

export async function setup(app: App) {
  await app.register(Cookie, {
    secret: Buffer.from(config.cookie_secret_token, 'hex'),
    hook: 'preHandler',
    parseOptions: cookiesPluginOption,
  });
  app.addHook('preHandler', Auth);
  app.addHook('preHandler', async function (req, reply) {
    if (req.auth.login) {
      const user = res.toResUser(await fetchUserX(req.auth.userID));
      reply.locals = { user };
    }
  });

  await app.register(formBody);
  await app.register(userOauthRoutes);
}

// export for testing
// eslint-disable-next-line @typescript-eslint/require-await
export async function userOauthRoutes(app: App) {
  const csrf = new CSRF({
    userInfo: true,
    hmacKey: Buffer.from(config.csrf_secret_token, 'hex'),
  });

  app.get(
    '/authorize',
    {
      schema: {
        hide: true,
        querystring: t.Object({
          client_id: t.String(),
          response_type: t.String(),
          redirect_uri: t.Optional(t.String()),
          scope: t.Optional(t.String()),
          state: t.Optional(t.String()),
        }),
      },
    },
    async (req, reply) => {
      if (!req.auth.login) {
        const qs = new URLSearchParams({ backTo: req.url });
        return reply.redirect(`/login?${qs.toString()}`);
      }

      if (req.query.response_type !== 'code') {
        return await reply.view('oauth/authorize', { error: InvalidResponseTypeError });
      }

      const [
        {
          chii_oauth_clients: client = null,
          chii_members: creator = null,
          chii_apps: app = null,
        } = {},
      ] = await db
        .select()
        .from(chiiOauthClients)
        .innerJoin(chiiApp, op.eq(chiiApp.id, chiiOauthClients.appID))
        .innerJoin(chiiUser, op.eq(chiiApp.creator, chiiUser.id))
        .where(op.eq(chiiOauthClients.clientID, req.query.client_id))
        .limit(1);

      if (!client) {
        return await reply.view('oauth/authorize', {
          error: AppNonexistenceError,
        });
      }

      if (!client.redirectUri) {
        return await reply.view('oauth/authorize', {
          error: { message: 'client missing redirect_uri config' },
        });
      }

      if (req.query.redirect_uri && client.redirectUri !== req.query.redirect_uri) {
        return await reply.view('oauth/authorize', {
          error: RedirectUriMismatchError,
        });
      }
      if (!creator) {
        return await reply.view('oauth/authorize', {
          error: AppCreatorNonexsistenceError,
        });
      }

      let csrfSecret;
      const currentSignedCsrfSecretCookie = req.cookies['csrf-secret'];
      if (currentSignedCsrfSecretCookie) {
        const r = req.unsignCookie(currentSignedCsrfSecretCookie);
        if (r.valid) {
          csrfSecret = r.value;
        }
      }

      if (!csrfSecret) {
        csrfSecret = await csrf.secret();
        reply.cookie('csrf-secret', reply.signCookie(csrfSecret), { httpOnly: true, secure: true });
      }

      const csrfToken = csrf.create(csrfSecret, req.auth.userID.toString());

      await reply.view('oauth/authorize', {
        app,
        csrfToken,
        client,
        creator,
      });
    },
  );

  app.post(
    '/authorize',
    {
      schema: {
        hide: true,
        body: t.Object({
          csrf_token: t.String(),
          client_id: t.String(),
          redirect_uri: t.String(),
        }),
      },
    },
    async (req, reply) => {
      if (!req.auth.login) {
        throw new NeedLoginError('oauth authorize');
      }

      const csrfSecret = req.cookies['csrf-secret'];
      if (!csrfSecret) {
        throw new BadRequestError('Invalid CSRF token');
      }

      const realCsrfSecret = reply.unsignCookie(csrfSecret);
      if (!realCsrfSecret.valid) {
        throw new BadRequestError('Invalid CSRF token');
      }

      if (!csrf.verify(realCsrfSecret.value, req.body.csrf_token, req.auth.userID.toString())) {
        throw new BadRequestError('Invalid CSRF token');
      }

      const [client] = await db
        .select()
        .from(chiiOauthClients)
        .where(op.eq(chiiOauthClients.clientID, req.body.client_id))
        .limit(1)
        .execute();
      if (!client) {
        throw new AppNonexistenceError();
      }

      if (client.redirectUri !== req.body.redirect_uri) {
        throw new RedirectUriMismatchError();
      }

      const code = await randomBase64url(30);
      await redis.setex(`${redisOauthPrefix}:code:${code}`, 60, req.auth.userID);
      const u = new URL(client.redirectUri);
      u.searchParams.set('code', code);
      return reply.redirect(u.toString());
    },
  );

  app.addSchema(TokenResponse);

  app.post(
    '/access_token',
    {
      schema: {
        hide: true,
        body: t.Object({
          grant_type: t.Union([t.Literal('authorization_code'), t.Literal('refresh_token')]),
          client_id: t.String(),
          client_secret: t.String(),
          code: t.Optional(t.String()),
          refresh_token: t.Optional(t.String()),
          redirect_uri: t.String(),
          state: t.Optional(t.String()),
        }),
      },
    },
    async (req) => {
      if (req.body.grant_type === 'authorization_code') {
        if (!req.body.code) {
          throw new MissingAuthorizationCodeError();
        }

        return await tokenFromCode({
          clientID: req.body.client_id,
          clientSecret: req.body.client_secret,
          code: req.body.code,
          redirectUri: req.body.redirect_uri,
          state: req.body.state,
        });
      }

      if (req.body.grant_type === 'refresh_token') {
        if (!req.body.refresh_token) {
          throw new MissingRefreshTokenError();
        }

        return await tokenFromRefresh({
          clientID: req.body.client_id,
          clientSecret: req.body.client_secret,
          refreshToken: req.body.refresh_token,
          redirectUri: req.body.redirect_uri,
        });
      }

      throw new InvalidGrantTypeError();
    },
  );
}

async function tokenFromCode(req: {
  code: string;
  clientID: string;
  redirectUri: string;
  clientSecret: string;
  state?: string;
}): Promise<ITokenResponse> {
  const [{ chii_oauth_clients: client = null, chii_apps: app = null } = {}] = await db
    .select()
    .from(chiiOauthClients)
    .innerJoin(chiiApp, op.eq(chiiOauthClients.appID, chiiApp.id))
    .where(op.eq(chiiOauthClients.clientID, req.clientID))
    .limit(1)
    .execute();

  if (!client || !app) {
    throw new AppNonexistenceError();
  }
  if (client.redirectUri !== req.redirectUri) {
    throw new RedirectUriMismatchError();
  }
  if (client.clientSecret !== req.clientSecret) {
    throw new InvalidClientSecretError();
  }
  const userID = await redis.get(`${redisOauthPrefix}:code:${req.code}`);
  if (!userID) {
    throw new InvalidAuthorizationCodeError();
  }

  const now = new Date();

  await redis.del(`${redisOauthPrefix}:code:${req.code}`);
  const tokenInfo = JSON.stringify({
    name: app.name,
    created_at: now.toISOString(),
  } satisfies TokenInfo);

  const token: typeof chiiAccessToken.$inferInsert = {
    type: TokenType.AccessToken,
    userID: userID,
    clientID: client.clientID,
    accessToken: await randomBase62String(40),
    expiredAt: DateTime.fromJSDate(now)
      .plus(Duration.fromObject({ seconds: ACCESS_TOKEN_TTL_SECONDS }))
      .toJSDate(),
    info: tokenInfo,
  };

  const refresh: typeof chiiOAuthRefreshToken.$inferInsert = {
    userID: userID,
    clientID: client.clientID,
    refreshToken: await randomBase62String(40),
    expiredAt: DateTime.fromJSDate(now)
      .plus(Duration.fromObject({ seconds: REFRESH_TOKEN_TTL_SECONDS }))
      .toJSDate(),
  };

  await db.transaction(async (t) => {
    await t.insert(chiiAccessToken).values(token);
    await t.insert(chiiOAuthRefreshToken).values(refresh);
  });

  return {
    access_token: token.accessToken,
    expires_in: ACCESS_TOKEN_TTL_SECONDS,
    token_type: 'Bearer',
    refresh_token: refresh.refreshToken,
    user_id: userID,
  };
}

async function tokenFromRefresh(req: {
  refreshToken: string;
  clientID: string;
  redirectUri: string;
  clientSecret: string;
}): Promise<ITokenResponse> {
  const now = DateTime.now();

  const refresh = await db.query.chiiOAuthRefreshToken.findFirst({
    where: op.and(
      op.eq(chiiOAuthRefreshToken.refreshToken, req.refreshToken),
      op.gt(chiiOAuthRefreshToken.expiredAt, now.toJSDate()),
    ),
  });
  if (!refresh) {
    throw new InvalidRefreshTokenError();
  }

  const [{ chii_oauth_clients: client = null, chii_apps: app = null } = {}] = await db
    .select()
    .from(chiiOauthClients)
    .innerJoin(chiiApp, op.eq(chiiOauthClients.appID, chiiApp.id))
    .where(op.eq(chiiOauthClients.clientID, req.clientID))
    .limit(1)
    .execute();
  if (!client || !app) {
    throw new InvalidClientIDError();
  }
  if (client.redirectUri !== req.redirectUri) {
    throw new RedirectUriMismatchError();
  }
  if (client.clientSecret !== req.clientSecret) {
    throw new InvalidClientSecretError();
  }

  const token: typeof chiiAccessToken.$inferInsert = {
    type: TokenType.AccessToken,
    userID: refresh.userID,
    clientID: client.clientID,
    accessToken: await randomBase62String(40),
    expiredAt: now.plus(Duration.fromObject({ seconds: ACCESS_TOKEN_TTL_SECONDS })).toJSDate(),
    scope: refresh.scope,
    info: JSON.stringify({
      name: app.name,
      created_at: now.toISO(),
    } satisfies TokenInfo),
  };

  const newRefresh: typeof chiiOAuthRefreshToken.$inferInsert = {
    userID: refresh.userID,
    clientID: client.clientID,
    refreshToken: await randomBase62String(40),
    expiredAt: now.plus(Duration.fromObject({ seconds: REFRESH_TOKEN_TTL_SECONDS })).toJSDate(),
    scope: refresh.scope,
  };

  await db.transaction(async (t) => {
    await t.insert(chiiAccessToken).values(token);
    await t.insert(chiiOAuthRefreshToken).values(newRefresh);

    await t
      .update(chiiOAuthRefreshToken)
      .set({ expiredAt: now.toJSDate() })
      .where(op.eq(chiiOAuthRefreshToken.refreshToken, req.refreshToken))
      .execute();
  });

  return {
    access_token: token.accessToken,
    expires_in: ACCESS_TOKEN_TTL_SECONDS,
    token_type: 'Bearer',
    refresh_token: newRefresh.refreshToken,
    user_id: newRefresh.userID,
  };
}
