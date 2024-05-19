import * as crypto from 'node:crypto';
import * as path from 'node:path';

import Cookie from '@fastify/cookie';
import { createError } from '@fastify/error';
import { fastifyView } from '@fastify/view';
import { Type as t } from '@sinclair/typebox';
import { Liquid } from 'liquidjs';

import { NeedLoginError } from '@app/lib/auth/index.ts';
import { cookiesPluginOption } from '@app/lib/auth/session.ts';
import config, { production, projectRoot, redisOauthPrefix } from '@app/lib/config.ts';
import * as orm from '@app/lib/orm/index.ts';
import redis from '@app/lib/redis.ts';
import { SessionAuth } from '@app/routes/hooks/pre-handler.ts';
import type { App } from '@app/routes/type.ts';

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

      const buf = crypto.randomBytes(20);
      const code = buf.toString('hex');
      await redis.setex(`${redisOauthPrefix}:code:${code}`, 60, '1');
      const qs = new URLSearchParams({
        code,
      });

      const redirect = `${client.redirectUri}?${qs.toString()}`;
      return {
        redirect,
      };
    },
  );
}
