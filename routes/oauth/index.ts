import * as path from 'node:path';

import Cookie from '@fastify/cookie';
import { fastifyStatic } from '@fastify/static';
import { fastifyView } from '@fastify/view';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { Liquid } from 'liquidjs';

import { cookiesPluginOption } from '@app/lib/auth/session.ts';
import config, { production, projectRoot } from '@app/lib/config.ts';
import { fetchUserX } from '@app/lib/orm/index.ts';
import * as res from '@app/lib/types/res.ts';
import { SessionAuth } from '@app/routes/hooks/pre-handler.ts';
import type { App } from '@app/routes/type.ts';

declare module 'fastify' {
  interface FastifyReply {
    locals?: {
      user?: res.IUser;
    };
  }
}

async function redirectIfNotLogin(req: FastifyRequest, reply: FastifyReply) {
  if (!req.auth.login) {
    const qs = new URLSearchParams({ to: req.url });
    return reply.redirect(`/oauth/login?${qs.toString()}`);
  }
}

/* eslint-disable-next-line @typescript-eslint/require-await */
export async function setup(app: App) {
  await app.register(Cookie, {
    hook: 'preHandler',
    parseOptions: cookiesPluginOption,
  });

  void app.addHook('preHandler', SessionAuth);

  app.addHook('preHandler', async function (req, reply) {
    if (req.auth.login) {
      const user = res.toResUser(await fetchUserX(req.auth.userID));
      reply.locals = { user };
    }
  });

  await app.register(fastifyStatic, {
    root: path.resolve(projectRoot, 'static'),
    dotfiles: 'ignore',
    prefix: '/static/',
  });

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

/* eslint-disable-next-line @typescript-eslint/require-await */
async function userOauthRoutes(app: App) {
  app.get('/login', { schema: { hide: true } }, async (req, res) => {
    await res.view('oauth/login', { TURNSTILE_SITE_KEY: config.turnstile.siteKey });
  });
  app.get(
    '/authorize',
    { preHandler: [redirectIfNotLogin], schema: { hide: true } },
    async (_, res) => {
      // TODO: check client id
      await res.view('oauth/authorize');
    },
  );
  app.post('/authorize', { preHandler: [redirectIfNotLogin], schema: { hide: true } }, async () => {
    // TODO: generate token and redirect
  });
}
