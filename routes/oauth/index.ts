import * as path from 'node:path';

import Cookie from '@fastify/cookie';
import { createError } from '@fastify/error';
import { fastifyView } from '@fastify/view';
import type { Static } from '@sinclair/typebox';
import { Type as t } from '@sinclair/typebox';
import { Liquid } from 'liquidjs';
import { DateTime, Duration } from 'luxon';

import { NeedLoginError } from '@app/lib/auth/index.ts';
import { cookiesPluginOption } from '@app/lib/auth/session.ts';
import config, { production, projectRoot, redisOauthPrefix } from '@app/lib/config.ts';
import * as orm from '@app/lib/orm/index.ts';
import redis from '@app/lib/redis.ts';
import { randomBase62String, randomBytes } from '@app/lib/utils/index.ts';
import { SessionAuth } from '@app/routes/hooks/pre-handler.ts';
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

// eslint-disable-next-line @typescript-eslint/require-await
export async function setup(app: App) {
  await app.register(Cookie, {
    hook: 'preHandler',
    parseOptions: cookiesPluginOption,
  });
  app.addHook('preHandler', SessionAuth);

  const liquid = new Liquid({
    root: path.resolve(projectRoot, 'templates'),
    extname: '.liquid',
    cache: production,
  });

  await app.register(fastifyView, {
    engine: {
      liquid,
    },
    defaultContext: { production },
    root: path.resolve(projectRoot, 'templates'),
    production,
  });

  await app.register(userOauthRoutes);
}

// eslint-disable-next-line @typescript-eslint/require-await
async function userOauthRoutes(app: App) {
  app.get('/login', { schema: { hide: true } }, async (req, reply) => {
    await reply.view('oauth/login', { TURNSTILE_SITE_KEY: config.turnstile.siteKey });
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
        const qs = new URLSearchParams({ to: req.url });
        return reply.redirect(`/oauth/login?${qs.toString()}`);
      }

      if (req.query.response_type !== 'code') {
        return await reply.view('oauth/authorize', {
          error: 'invalid_response_type',
        });
      }
      const client = await orm.OauthClientRepo.findOneBy({ clientID: req.query.client_id });
      if (client === null) {
        return await reply.view('oauth/authorize', {
          error: 'app_nonexistence',
        });
      }
      if (req.query.redirect_uri !== null && client.redirectUri !== req.query.redirect_uri) {
        return await reply.view('oauth/authorize', {
          error: 'redirect_uri_mismatch',
        });
      }
      const creator = await orm.UserRepo.findOneBy({ id: client.app.appCreator });
      if (creator === null) {
        return await reply.view('oauth/authorize', {
          error: 'app_creator_nonexistence',
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
    async (req) => {
      if (!req.auth.login) {
        throw new NeedLoginError('oauth authorize');
      }

      const client = await orm.OauthClientRepo.findOneBy({ clientID: req.body.client_id });
      if (client === null) {
        throw createError('NOT_FOUND', 'app_nonexistence', 404);
      }

      if (client.redirectUri !== req.body.redirect_uri) {
        throw createError('BAD_REQUEST', 'redirect_uri_mismatch', 400);
      }

      const buf = await randomBytes(20);
      const code = buf.toString('hex');
      await redis.setex(`${redisOauthPrefix}:code:${code}`, 60, req.auth.userID);
      const qs = new URLSearchParams({
        code,
      });

      const redirect = `${client.redirectUri}?${qs.toString()}`;
      return {
        redirect,
      };
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
            throw createError('BAD_REQUEST', 'missing_code', 400);
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
            throw createError('BAD_REQUEST', 'missing_refresh_token', 400);
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
          throw createError('BAD_REQUEST', 'invalid_grant_type', 400);
        }
      }
    },
  );
}

async function tokenFromCode(req: ITokenRequestCode): Promise<ITokenResponse> {
  const client = await orm.OauthClientRepo.findOneBy({ clientID: req.clientID });
  if (client === null) {
    throw createError('NOT_FOUND', 'app_nonexistence', 404);
  }
  if (client.redirectUri !== req.redirectUri) {
    throw createError('BAD_REQUEST', 'redirect_uri_mismatch', 400);
  }
  if (client.clientSecret !== req.clientSecret) {
    throw createError('BAD_REQUEST', 'invalid_client_secret', 400);
  }
  const userID = await redis.get(`${redisOauthPrefix}:code:${req.code}`);
  if (!userID) {
    throw createError('BAD_REQUEST', 'invalid_code', 400);
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
  await orm.AccessTokenRepo.insert(token);
  await orm.AccessTokenRepo.insert(refresh);
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
    throw createError('NOT_FOUND', 'app_nonexistence', 404);
  }
  if (client.redirectUri !== req.redirectUri) {
    throw createError('BAD_REQUEST', 'redirect_uri_mismatch', 400);
  }
  if (client.clientSecret !== req.clientSecret) {
    throw createError('BAD_REQUEST', 'invalid_client_secret', 400);
  }
  const refresh = await orm.AccessTokenRepo.findOneBy({
    type: TokenType.OauthToken,
    accessToken: req.refreshToken,
  });
  if (refresh === null) {
    throw createError('BAD_REQUEST', 'invalid_refresh_token', 400);
  }
  if (refresh.clientId !== client.clientID) {
    throw createError('BAD_REQUEST', 'invalid_client_id', 400);
  }
  if (refresh.expires < new Date()) {
    throw createError('BAD_REQUEST', 'refresh_token_expired', 400);
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
