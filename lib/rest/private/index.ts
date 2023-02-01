import * as path from 'node:path';

import Cookie from '@fastify/cookie';
import { fastifyStatic } from '@fastify/static';
import { fastifyView } from '@fastify/view';
import { Liquid } from 'liquidjs';

import { production, projectRoot } from '@app/lib/config';
import * as orm from '@app/lib/orm';
import * as demo from '@app/lib/rest/demo';
import { SessionAuth } from '@app/lib/rest/hooks/pre-handler';
import * as mobile from '@app/lib/rest/m2';
import * as me from '@app/lib/rest/routes/me';
import * as swagger from '@app/lib/rest/swagger';
import type { App } from '@app/lib/rest/type';
import { toResUser } from '@app/lib/types/res';

import * as login from './routes/login';
import * as post from './routes/post';
import * as group from './routes/topic';
import * as user from './routes/user';
import * as wiki from './routes/wiki';

export async function setup(app: App) {
  if (production) {
    app.addHook('onRequest', async (req, res) => {
      if (req.method === 'GET') {
        return;
      }

      const ref = req.headers.referer;
      if (ref && !ref.startsWith('https://next.bgm.tv/')) {
        await res.send('bad referer');
      }
    });
  }

  await app.register(Cookie, {
    hook: 'preHandler', // set to false to disable cookie autoparsing or set autoparsing on any of the following hooks: 'onRequest', 'preParsing', 'preHandler', 'preValidation'. default: 'onRequest'
    parseOptions: {}, // options for parsing cookies
  });

  void app.addHook('preHandler', SessionAuth);

  await app.register(API, { prefix: '/p1' });

  await app.register(fastifyStatic, {
    root: path.resolve(projectRoot, 'static'),
    prefix: '/demo/static/',
  });

  /** Make sure `fastifyView` is scoped */
  await app.register(async (app) => {
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

    app.addHook('preHandler', async (req, res) => {
      if (req.auth.login) {
        res.locals = {
          user: toResUser(await orm.fetchUserX(req.auth.userID)),
        };
      } else {
        res.locals = {};
      }
    });

    await app.register(demo.setup, { prefix: '/demo' });
    await app.register(mobile.setup, { prefix: '/m2' });
  });
}

async function API(app: App) {
  await swagger.privateAPI(app);

  await app.register(login.setup);
  await app.register(me.setup);
  await app.register(group.setup);
  await app.register(post.setup);
  await app.register(user.setup);
  await app.register(wiki.setup, { prefix: '/wiki' });
}
