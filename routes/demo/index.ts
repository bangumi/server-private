import * as path from 'node:path';

import Cookie from '@fastify/cookie';
import { fastifyStatic } from '@fastify/static';
import { fastifyView } from '@fastify/view';
import { Liquid } from 'liquidjs';

import { cookiesPluginOption } from '@app/lib/auth/session';
import config, { production, projectRoot } from '@app/lib/config';
import * as Notify from '@app/lib/notify';
import { fetchUserX } from '@app/lib/orm';
import * as res from '@app/lib/types/res';
import * as admin from '@app/routes/admin';
import { SessionAuth } from '@app/routes/hooks/pre-handler';
import type { App } from '@app/routes/type';

import * as editor from './editor';
import * as token from './token';

declare module 'fastify' {
  interface FastifyReply {
    locals?: {
      user?: res.IUser;
    };
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

  editor.setup(app);
  token.setup(app);
}
