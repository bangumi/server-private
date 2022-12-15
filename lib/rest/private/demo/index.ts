import path from 'node:path';

import { fastifyView } from '@fastify/view';
import { Liquid } from 'liquidjs';

import { production, projectRoot, TURNSTILE_SITE_KEY } from '../../../config';
import * as Notify from '../../../notify';
import { fetchUser } from '../../../orm';
import { avatar } from '../../../response';
import type { App } from '../../type';

export async function setup(app: App) {
  const liquid = new Liquid({
    root: path.resolve(projectRoot, 'lib/templates'),
    extname: '.liquid',
    cache: production,
  });

  await app.register(fastifyView, {
    engine: { liquid },
    defaultContext: { production },
    root: path.resolve(projectRoot, 'lib/templates'),
    production,
  });

  app.get('/', { schema: { hide: true } }, async (req, res) => {
    if (req.auth.login) {
      const user = await fetchUser(req.auth.userID);
      const notifyCount = await Notify.count(req.auth.userID);

      let notify: Notify.INotify[] = [];
      if (notifyCount) {
        notify = await Notify.list(req.auth.userID, { unread: true, limit: 20 });
      }

      await res.view('user', {
        user: { ...user, avatar: avatar(user?.img ?? '') },
        notifyCount,
        notify,
      });
    } else {
      await res.view('login', { TURNSTILE_SITE_KEY });
    }
  });

  app.get('/login', { schema: { hide: true } }, async (req, res) => {
    await res.view('login', { TURNSTILE_SITE_KEY });
  });
}
