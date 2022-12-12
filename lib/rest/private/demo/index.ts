import path from 'node:path';

import { fastifyView } from '@fastify/view';
import handlebars from 'handlebars';

import { production, projectRoot, TURNSTILE_SITE_KEY } from '../../../config';
import { fetchUser } from '../../../orm';
import { avatar } from '../../../response';
import type { App } from '../../type';

export async function setup(app: App) {
  await app.register(fastifyView, {
    engine: {
      handlebars,
    },

    layout: 'layout',
    root: path.resolve(projectRoot, 'lib/templates'),
    viewExt: 'hbs',
    defaultContext: { production },
    maxCache: production ? 100 : 0,
  });

  app.get('/', { schema: { hide: true } }, async (req, res) => {
    if (req.auth.login) {
      const user = await fetchUser(req.auth.userID);
      await res.view('user', { user: { ...user, avatar: avatar(user?.img ?? '') } });
    } else {
      await res.view('login', {});
    }
  });

  app.get('/login', { schema: { hide: true } }, async (req, res) => {
    await res.view('login', {});
  });

  app.get('/login2', { schema: { hide: true } }, async (req, res) => {
    await res.view('login2', { TURNSTILE_SITE_KEY });
  });
}
