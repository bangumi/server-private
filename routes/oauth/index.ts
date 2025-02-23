import Cookie from '@fastify/cookie';
import { createError } from '@fastify/error';
import formBody from '@fastify/formbody';
import type { Static } from '@sinclair/typebox';
import { Type as t } from '@sinclair/typebox';
import { sql } from 'drizzle-orm';
import type { FastifySchema } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import { DateTime, Duration } from 'luxon';

import { db, op, schema } from '@app/drizzle';
import { NeedLoginError } from '@app/lib/auth/index.ts';
import { cookiesPluginOption } from '@app/lib/auth/session.ts';
import config, { redisOauthPrefix } from '@app/lib/config.ts';
import { BadRequestError } from '@app/lib/error.ts';
import redis from '@app/lib/redis.ts';
import { EpochDefaultScope, type IScope, Scope, scopeMessage } from '@app/lib/scope.ts';
import * as fetcher from '@app/lib/types/fetcher.ts';
import { fetchUserX } from '@app/lib/user/utils.ts';
import { randomBase64url } from '@app/lib/utils/index.ts';
import { Auth } from '@app/routes/hooks/pre-handler.ts';
import type { App, Reply, Request } from '@app/routes/type.ts';

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
      const user = await fetchUserX(req.auth.userID);
      reply.locals = { user };
    }
  });

  await app.register(formBody);
  await app.register(userOauthRoutes);
}

class CSRF {
  async newToken(req: Request<FastifySchema>, reply: Reply<FastifySchema>): Promise<string> {
    const currentSignedCsrfSecretCookie = req.cookies['csrf-secret'];
    if (currentSignedCsrfSecretCookie) {
      const r = req.unsignCookie(currentSignedCsrfSecretCookie);
      if (r.valid) {
        return currentSignedCsrfSecretCookie;
      }
    }

    const token = req.auth.userID.toString() + ':' + (await randomBase64url(30));
    const v = reply.signCookie(token);
    reply.cookie('csrf-secret', v, { httpOnly: true, secure: true });
    return v;
  }

  verifyToken(token: string, req: Request<FastifySchema>): boolean {
    if (token !== req.cookies['csrf-secret']) {
      return false;
    }

    const r = req.unsignCookie(token);
    if (!r.valid) {
      return false;
    }

    return r.value.startsWith(req.auth.userID.toString() + ':');
  }
}

function parseScope(scope: string): Required<keyof IScope>[] {
  if (!scope) {
    return Object.keys(EpochDefaultScope()) as (keyof IScope)[];
  }

  return scope
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      if (!(s in Scope.properties)) {
        throw new Error(`invalid scope: ${JSON.stringify(s)}`);
      }
      return s;
    }) as (keyof IScope)[];
}

interface ReqInfo {
  userID: string;
  scope: string[];
}

// export for testing
// eslint-disable-next-line @typescript-eslint/require-await
export async function userOauthRoutes(app: App) {
  const csrf = new CSRF();

  app.get(
    '/authorize',
    {
      schema: {
        hide: true,
        querystring: t.Object({
          client_id: t.String(),
          response_type: t.String(),
          redirect_uri: t.Optional(t.String()),
          scope: t.String({
            default: '',
            description: "only works with new oauth authorization, won't work in refresh request",
          }),
          state: t.Optional(t.String()),
        }),
      },
    },
    async (req, reply) => {
      if (!req.auth.login) {
        const qs = new URLSearchParams({ backTo: req.url });
        return reply.redirect(`/login?${qs.toString()}`);
      }
      const user = await fetcher.fetchSlimUserByID(req.auth.userID);
      if (!user) {
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
        .from(schema.chiiOauthClients)
        .innerJoin(schema.chiiApp, op.eq(schema.chiiApp.id, schema.chiiOauthClients.appID))
        .innerJoin(schema.chiiUsers, op.eq(schema.chiiApp.creator, schema.chiiUsers.id))
        .where(op.eq(schema.chiiOauthClients.clientID, req.query.client_id))
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

      const scope = parseScope(req.query.scope);

      const csrfToken = await csrf.newToken(req, reply);

      await reply.view('oauth/authorize', {
        app,
        user,
        csrfToken,
        client,
        creator,
        scope: req.query.scope,
        scopes: scopeMessage(scope),
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
          scope: t.String({ default: '' }),
        }),
      },
    },
    async (req, reply) => {
      if (!req.auth.login) {
        throw new NeedLoginError('oauth authorize');
      }

      if (!csrf.verifyToken(req.body.csrf_token, req)) {
        throw new BadRequestError('Invalid CSRF token');
      }

      const [client] = await db
        .select()
        .from(schema.chiiOauthClients)
        .where(op.eq(schema.chiiOauthClients.clientID, req.body.client_id))
        .limit(1);
      if (!client) {
        throw new AppNonexistenceError();
      }

      const scope = parseScope(req.body.scope);

      if (client.redirectUri !== req.body.redirect_uri) {
        throw new RedirectUriMismatchError();
      }

      const code = await randomBase64url(30);
      await redis.setex(
        `${redisOauthPrefix}:code:${code}`,
        60,
        JSON.stringify({
          scope,
          userID: req.auth.userID.toString(),
        } satisfies ReqInfo),
      );
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
    .from(schema.chiiOauthClients)
    .innerJoin(schema.chiiApp, op.eq(schema.chiiOauthClients.appID, schema.chiiApp.id))
    .where(op.eq(schema.chiiOauthClients.clientID, req.clientID))
    .limit(1);

  if (!client || !app) {
    throw new AppNonexistenceError();
  }
  if (client.redirectUri !== req.redirectUri) {
    throw new RedirectUriMismatchError();
  }
  if (client.clientSecret !== req.clientSecret) {
    throw new InvalidClientSecretError();
  }
  const authInfo = await redis.get(`${redisOauthPrefix}:code:${req.code}`);
  if (!authInfo) {
    throw new InvalidAuthorizationCodeError();
  }

  const { userID, scope } = JSON.parse(authInfo) as ReqInfo;

  const now = new Date();

  await redis.del(`${redisOauthPrefix}:code:${req.code}`);
  const tokenInfo = JSON.stringify({
    name: app.name,
    created_at: now.toISOString(),
  } satisfies TokenInfo);

  const rawScope = JSON.stringify(scope);

  const token: typeof schema.chiiAccessToken.$inferInsert = {
    type: TokenType.AccessToken,
    userID: userID,
    clientID: client.clientID,
    accessToken: await randomBase64url(30),
    expiredAt: DateTime.fromJSDate(now)
      .plus(Duration.fromObject({ seconds: ACCESS_TOKEN_TTL_SECONDS }))
      .toJSDate(),
    scope: rawScope,
    info: tokenInfo,
  };

  const refresh: typeof schema.chiiOAuthRefreshToken.$inferInsert = {
    userID: userID,
    clientID: client.clientID,
    refreshToken: await randomBase64url(30),
    scope: rawScope,
    expiredAt: DateTime.fromJSDate(now)
      .plus(Duration.fromObject({ seconds: REFRESH_TOKEN_TTL_SECONDS }))
      .toJSDate(),
  };

  await db.transaction(async (t) => {
    await t.insert(schema.chiiAccessToken).values(token);
    await t.insert(schema.chiiOAuthRefreshToken).values(refresh);
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

  const [accessToken, refreshToken, userID] = await db.transaction(async (t) => {
    const [refresh] = await t
      .select()
      .from(schema.chiiOAuthRefreshToken)
      .where(
        op.and(
          sql`refresh_token = ${req.refreshToken} collate utf8mb4_bin`,
          op.gt(schema.chiiOAuthRefreshToken.expiredAt, now.toJSDate()),
        ),
      )
      .limit(1)
      .for('update');
    if (!refresh) {
      throw new InvalidRefreshTokenError();
    }

    const [{ chii_oauth_clients: client = null, chii_apps: app = null } = {}] = await t
      .select()
      .from(schema.chiiOauthClients)
      .innerJoin(schema.chiiApp, op.eq(schema.chiiOauthClients.appID, schema.chiiApp.id))
      .where(op.eq(schema.chiiOauthClients.clientID, req.clientID))
      .limit(1);
    if (!client || !app) {
      throw new InvalidClientIDError();
    }
    if (client.redirectUri !== req.redirectUri) {
      throw new RedirectUriMismatchError();
    }
    if (client.clientSecret !== req.clientSecret) {
      throw new InvalidClientSecretError();
    }

    const token: typeof schema.chiiAccessToken.$inferInsert = {
      type: TokenType.AccessToken,
      userID: refresh.userID,
      clientID: client.clientID,
      accessToken: await randomBase64url(30),
      expiredAt: now.plus(Duration.fromObject({ seconds: ACCESS_TOKEN_TTL_SECONDS })).toJSDate(),
      scope: refresh.scope,
      info: JSON.stringify({
        name: app.name,
        created_at: now.toISO(),
      } satisfies TokenInfo),
    };

    const newRefresh: typeof schema.chiiOAuthRefreshToken.$inferInsert = {
      userID: refresh.userID,
      clientID: client.clientID,
      refreshToken: await randomBase64url(30),
      expiredAt: now.plus(Duration.fromObject({ seconds: REFRESH_TOKEN_TTL_SECONDS })).toJSDate(),
      scope: refresh.scope,
    };

    await t.insert(schema.chiiAccessToken).values(token);
    await t.insert(schema.chiiOAuthRefreshToken).values(newRefresh);

    await t
      .update(schema.chiiOAuthRefreshToken)
      .set({ expiredAt: now.toJSDate() })
      .where(sql`refresh_token = ${req.refreshToken} collate utf8mb4_bin`);

    return [token.accessToken, newRefresh.refreshToken, refresh.userID];
  });

  return {
    access_token: accessToken,
    expires_in: ACCESS_TOKEN_TTL_SECONDS,
    token_type: 'Bearer',
    refresh_token: refreshToken,
    user_id: userID,
  };
}
