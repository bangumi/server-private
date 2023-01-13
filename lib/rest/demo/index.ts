import * as path from 'node:path';

import { fastifyStatic } from '@fastify/static';
import { fastifyView } from '@fastify/view';
import { Liquid } from 'liquidjs';

import config, { production, projectRoot } from '@app/lib/config';
import * as Notify from '@app/lib/notify';
import { fetchUserX } from '@app/lib/orm';
import type { App } from '@app/lib/rest/type';
import { userToResCreator } from '@app/lib/types/res';

import * as editor from './editor';
import * as token from './token';

export async function setup(app: App) {
  const liquid = new Liquid({
    root: path.resolve(projectRoot, 'templates'),
    extname: '.liquid',
    cache: production,
  });

  await app.register(fastifyStatic, {
    root: path.resolve(projectRoot, 'static'),
    prefix: '/static/',
  });

  await app.register(fastifyView, {
    engine: { liquid },
    defaultContext: { production },
    root: path.resolve(projectRoot, 'templates'),
    production,
  });

  app.get('/', { schema: { hide: true } }, async (req, res) => {
    if (req.auth.login) {
      const user = await fetchUserX(req.auth.userID);
      const notifyCount = await Notify.count(req.auth.userID);

      let notify: Notify.INotify[] = [];
      if (notifyCount) {
        notify = await Notify.list(req.auth.userID, { unread: true, limit: 20 });
      }

      await res.view('user', {
        user: userToResCreator(user),
        notifyCount,
        notify,
      });
    } else {
      await res.view('login', { TURNSTILE_SITE_KEY: config.turnstile.site_key });
    }
  });

  app.get('/login', { schema: { hide: true } }, async (req, res) => {
    await res.view('login', { TURNSTILE_SITE_KEY: config.turnstile.site_key });
  });

  editor.setup(app);
  token.setup(app);
}
