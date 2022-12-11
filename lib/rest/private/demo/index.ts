import path from 'node:path';

import fastifyView from '@fastify/view';
import handlebars from 'handlebars';

import { production, projectRoot } from '../../../config';
import { fetchUser } from '../../../orm';
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
  });

  app.get('/', async (req, res) => {
    if (req.auth.login) {
      const user = await fetchUser(req.auth.userID);
      await res.view('index', { user });
    } else {
      await res.view('login', {});
    }
  });
}
