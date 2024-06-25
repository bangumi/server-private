import Cookie from '@fastify/cookie';
import { createError } from '@fastify/error';
import * as formbody from '@fastify/formbody';
import type { Static } from '@sinclair/typebox';
import { Type as t } from '@sinclair/typebox';
import { StatusCodes } from 'http-status-codes';
import { DateTime, Duration } from 'luxon';

import { NeedLoginError } from '@app/lib/auth/index.ts';
import { cookiesPluginOption } from '@app/lib/auth/session.ts';
import { redisOauthPrefix } from '@app/lib/config.ts';
import * as entity from '@app/lib/orm/entity/index.ts';
import * as orm from '@app/lib/orm/index.ts';
import { AppDataSource, fetchUserX } from '@app/lib/orm/index.ts';
import redis from '@app/lib/redis.ts';
import * as res from '@app/lib/types/res.ts';
import { randomBase62String, randomBytes } from '@app/lib/utils/index.ts';
import { Auth } from '@app/routes/hooks/pre-handler.ts';
import type { App } from '@app/routes/type.ts';

export const enum TokenType {
  OauthToken = 0,
  AccessToken = 1,
}

interface TokenInfo {
  created_at: string; // RFC3339 string
  name: string;
}

const TokenRequestCode = t.Object(
  {
    clientID: t.String(),
    clientSecret: t.String(),
    code: t.String(),
    redirectUri: t.String(),
    state: t.Optional(t.String()),
  },
  { $id: 'TokenRequestCode' },
);
type ITokenRequestCode = Static<typeof TokenRequestCode>;

const TokenRequestRefresh = t.Object(
  {
    clientID: t.String(),
    clientSecret: t.String(),
    refreshToken: t.String(),
    redirectUri: t.String(),
    state: t.Optional(t.String()),
  },
  { $id: 'TokenRequestRefresh' },
);
type ITokenRequestRefresh = Static<typeof TokenRequestRefresh>;

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
  `Invalid refresh token`,
  StatusCodes.BAD_REQUEST,
);
const InvalidClientIDError = createError<[]>(
  'INVALID_CLIENT_ID',
  `Invalid client ID`,
  StatusCodes.BAD_REQUEST,
);
const RefreshTokenExpiredError = createError<[]>(
  'REFRESH_TOKEN_EXPIRED',
  `Refresh token expired`,
  StatusCodes.BAD_REQUEST,
);

// eslint-disable-next-line @typescript-eslint/require-await
export async function setup(app: App) {
  await app.register(Cookie, {
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

  await app.register(formbody);
  await app.register(userOauthRoutes);
}

// eslint-disable-next-line @typescript-eslint/require-await
async function userOauthRoutes(app: App) {
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
      const client = await orm.OauthClientRepo.findOneBy({ clientID: req.query.client_id });
      if (client === null) {
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
      const creator = await orm.UserRepo.findOneBy({ id: client.app.appCreator });
      if (creator === null) {
        return await reply.view('oauth/authorize', {
          error: AppCreatorNonexsistenceError,
        });
      }
      await reply.view('oauth/authorize', {
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
          client_id: t.String(),
          redirect_uri: t.String(),
        }),
      },
    },
    async (req, reply) => {
      if (!req.auth.login) {
        throw new NeedLoginError('oauth authorize');
      }

      const client = await orm.OauthClientRepo.findOneBy({ clientID: req.body.client_id });
      if (client === null) {
        throw AppNonexistenceError;
      }

      if (client.redirectUri !== req.body.redirect_uri) {
        throw RedirectUriMismatchError;
      }

      const buf = await randomBytes(30);
      const code = buf.toString('base64url');
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
          grant_type: t.String(),
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
      switch (req.body.grant_type) {
        case 'authorization_code': {
          if (!req.body.code) {
            throw MissingAuthorizationCodeError;
          }
          const tokenReq = {
            clientID: req.body.client_id,
            clientSecret: req.body.client_secret,
            code: req.body.code,
            redirectUri: req.body.redirect_uri,
            state: req.body.state,
          };
          return await tokenFromCode(tokenReq);
        }
        case 'refresh_token': {
          if (!req.body.refresh_token) {
            throw MissingRefreshTokenError;
          }
          const tokenReq = {
            clientID: req.body.client_id,
            clientSecret: req.body.client_secret,
            refreshToken: req.body.refresh_token,
            redirectUri: req.body.redirect_uri,
            state: req.body.state,
          };
          return await tokenFromRefresh(tokenReq);
        }
        default: {
          throw InvalidGrantTypeError;
        }
      }
    },
  );
}

async function tokenFromCode(req: ITokenRequestCode): Promise<ITokenResponse> {
  const client = await orm.OauthClientRepo.findOneBy({ clientID: req.clientID });
  if (client === null) {
    throw AppNonexistenceError;
  }
  if (client.redirectUri !== req.redirectUri) {
    throw RedirectUriMismatchError;
  }
  if (client.clientSecret !== req.clientSecret) {
    throw InvalidClientSecretError;
  }
  const userID = await redis.get(`${redisOauthPrefix}:code:${req.code}`);
  if (!userID) {
    throw InvalidAuthorizationCodeError;
  }
  await redis.del(`${redisOauthPrefix}:code:${req.code}`);
  const tokenInfo = JSON.stringify({
    name: client.app.appName,
    created_at: new Date().toISOString(),
  } satisfies TokenInfo);
  const token = {
    type: TokenType.AccessToken,
    userId: userID,
    clientId: client.clientID,
    accessToken: await randomBase62String(40),
    expires: DateTime.now()
      .plus(Duration.fromObject({ day: 7 }))
      .toJSDate(),
    info: tokenInfo,
  };
  const refresh = {
    type: TokenType.OauthToken,
    userId: userID,
    clientId: client.clientID,
    accessToken: await randomBase62String(40),
    expires: DateTime.now()
      .plus(Duration.fromObject({ day: 365 }))
      .toJSDate(),
    info: tokenInfo,
  };

  await AppDataSource.transaction(async (t) => {
    const AccessTokenRepo = t.getRepository(entity.OauthAccessTokens);
    await AccessTokenRepo.insert(token);
    await AccessTokenRepo.insert(refresh);
  });

  return {
    access_token: token.accessToken,
    expires_in: 604800,
    token_type: 'Bearer',
    refresh_token: refresh.accessToken,
    user_id: userID,
  };
}

async function tokenFromRefresh(req: ITokenRequestRefresh): Promise<ITokenResponse> {
  const client = await orm.OauthClientRepo.findOneBy({ clientID: req.clientID });
  if (client === null) {
    throw AppNonexistenceError;
  }
  if (client.redirectUri !== req.redirectUri) {
    throw RedirectUriMismatchError;
  }
  if (client.clientSecret !== req.clientSecret) {
    throw InvalidClientSecretError;
  }
  const refresh = await orm.AccessTokenRepo.findOneBy({
    type: TokenType.OauthToken,
    accessToken: req.refreshToken,
  });
  if (refresh === null) {
    throw InvalidRefreshTokenError;
  }
  if (refresh.clientId !== client.clientID) {
    throw InvalidClientIDError;
  }
  if (refresh.expires < new Date()) {
    throw RefreshTokenExpiredError;
  }

  const token = {
    type: TokenType.AccessToken,
    userId: refresh.userId,
    clientId: client.clientID,
    accessToken: await randomBase62String(40),
    expires: DateTime.now()
      .plus(Duration.fromObject({ day: 7 }))
      .toJSDate(),
    scope: refresh.scope,
    info: JSON.stringify({
      name: client.app.appName,
      created_at: new Date().toISOString(),
    } satisfies TokenInfo),
  };
  await orm.AccessTokenRepo.insert(token);
  return {
    access_token: token.accessToken,
    expires_in: 604800,
    token_type: 'Bearer',
    refresh_token: refresh.accessToken,
    user_id: refresh.userId,
  };
}
