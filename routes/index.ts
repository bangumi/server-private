import * as path from 'node:path';

import { fastifyStatic } from '@fastify/static';
import { fastifyView } from '@fastify/view';
import { Liquid } from 'liquidjs';

import type { IAuth } from '@app/lib/auth/index.ts';
import { production, projectRoot } from '@app/lib/config.ts';
import { logger } from '@app/lib/logger.ts';
import * as demo from '@app/routes/demo/index.ts';
import * as oauth from '@app/routes/oauth/index.ts';
import * as privateAPI from '@app/routes/private/index.ts';
import type { App } from '@app/routes/type.ts';

export async function setup(app: App) {
  app.get('/login', (req, reply) => {
    return reply.redirect('/demo' + req.url);
  });

  logger.debug('setup rest routes');

  app.decorateRequest('auth');

  const liquid = new Liquid({
    root: path.resolve(projectRoot, 'templates'),
    extname: '.liquid',
    cache: production,
    outputEscape: 'escape',
  });

  await app.register(fastifyView, {
    engine: {
      liquid,
    },
    defaultContext: { production },
    root: path.resolve(projectRoot, 'templates'),
    production,
  });

  await app.register(privateAPI.setup, { prefix: '/p1' });
  await app.register(demo.setup, { prefix: '/demo/' });
  await app.register(oauth.setup, { prefix: '/oauth/' });

  await app.register(fastifyStatic, {
    root: path.resolve(projectRoot, 'static/img/'),
    dotfiles: 'ignore',
    prefix: '/img/',
  });
}

declare module 'fastify' {
  interface FastifyRequest {
    auth: Readonly<IAuth>;
  }
}
