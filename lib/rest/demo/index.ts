import * as path from 'node:path';

import Cookie from '@fastify/cookie';
import { fastifyStatic } from '@fastify/static';
import { fastifyView } from '@fastify/view';
import { Liquid } from 'liquidjs';

import config, { production, projectRoot } from '@app/lib/config';
import * as Notify from '@app/lib/notify';
import { fetchUserX } from '@app/lib/orm';
import * as admin from '@app/lib/rest/admin';
import { SessionAuth } from '@app/lib/rest/hooks/pre-handler';
import * as mobile from '@app/lib/rest/m2';
import type { App } from '@app/lib/rest/type';
import * as res from '@app/lib/types/res';

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
    hook: 'preHandler', // set to false to disable cookie autoparsing or set autoparsing on any of the following hooks: 'onRequest', 'preParsing', 'preHandler', 'preValidation'. default: 'onRequest'
    parseOptions: {}, // options for parsing cookies
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
    prefix: '/demo/static/',
  });

  await app.register(fastifyView, {
    engine: {
      liquid: new Liquid({
        root: path.resolve(projectRoot, 'templates'),
        extname: '.liquid',
        cache: production,
      }),
    },
    defaultContext: { production },
    root: path.resolve(projectRoot, 'templates'),
    production,
  });

  /* eslint-disable-next-line @typescript-eslint/require-await */
  await app.register(
    async (app: App) => {
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
    },
    { prefix: '/demo/' },
  );

  await app.register(mobile.setup, { prefix: '/m2' });
  await app.register(admin.setup, { prefix: '/admin' });
}
