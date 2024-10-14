import * as path from 'node:path';

import Cookie from '@fastify/cookie';
import { fastifyStatic } from '@fastify/static';
import { Type as t } from '@sinclair/typebox';

import { cookiesPluginOption } from '@app/lib/auth/session.ts';
import config, { projectRoot } from '@app/lib/config.ts';
import { BadRequestError } from '@app/lib/error.ts';
import * as Notify from '@app/lib/notify.ts';
import { fetchUserX } from '@app/lib/orm/index.ts';
import * as convert from '@app/lib/types/convert.ts';
import type * as res from '@app/lib/types/res.ts';
import * as admin from '@app/routes/admin/index.ts';
import { Auth } from '@app/routes/hooks/pre-handler.ts';
import type { App } from '@app/routes/type.ts';

import * as editor from './editor.ts';
import * as token from './token/index.ts';

declare module 'fastify' {
  interface FastifyReply {
    locals?: {
      user?: res.IUser;
    };
  }
}

export async function setup(app: App) {
  await app.register(Cookie, {
    secret: Buffer.from(config.cookie_secret_token, 'hex'),
    hook: 'preHandler',
    parseOptions: cookiesPluginOption,
  });

  void app.addHook('preHandler', Auth);

  app.addHook('preHandler', async function (req, reply) {
    if (req.auth.login) {
      const user = convert.toUser(await fetchUserX(req.auth.userID));
      reply.locals = { user };
    }
  });

  await app.register(fastifyStatic, {
    root: path.resolve(projectRoot, 'static'),
    dotfiles: 'ignore',
    prefix: '/static/',
  });

  await app.register(admin.setup, { prefix: '/admin' });
  await app.register(userDemoRoutes);
}

/* eslint-disable-next-line @typescript-eslint/require-await */
async function userDemoRoutes(app: App) {
  app.get('/', { schema: { hide: true } }, async (req, res) => {
    if (req.auth.login) {
      const notifyCount = await Notify.count(req.auth.userID);

      let notify: Notify.INotify[] = [];
      if (notifyCount) {
        notify = await Notify.list(req.auth.userID, { unread: true, limit: 20 });
      }

      await res.view('user', {
        notifyCount,
        notify,
      });
    } else {
      await res.view('login', { TURNSTILE_SITE_KEY: config.turnstile.siteKey });
    }
  });

  app.get('/login', { schema: { hide: true } }, async (req, res) => {
    await res.view('login', { TURNSTILE_SITE_KEY: config.turnstile.siteKey });
  });

  app.get(
    '/turnstile',
    {
      schema: {
        hide: true,
        querystring: t.Object({
          theme: t.Optional(
            t.Enum({
              dark: 'dark',
              light: 'light',
              auto: 'auto',
            }),
          ),
          redirect_uri: t.String(),
        }),
      },
    },
    async (req, res) => {
      if (!/^https?:\/\//i.test(req.query.redirect_uri)) {
        throw BadRequestError('Invalid redirect_uri. It must start with http:// or https://');
      }
      await res.view('turnstile', {
        TURNSTILE_SITE_KEY: config.turnstile.siteKey,
        turnstile_theme: req.query.theme || 'auto',
        redirect_uri: req.query.redirect_uri,
      });
    },
  );

  editor.setup(app);
  token.setup(app);
}
