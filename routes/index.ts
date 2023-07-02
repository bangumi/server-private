import * as path from 'node:path';

import { fastifyStatic } from '@fastify/static';

import type { IAuth } from '@app/lib/auth/index.ts';
import { projectRoot } from '@app/lib/config.ts';
import { logger } from '@app/lib/logger.ts';
import * as demo from '@app/routes/demo/index.ts';
import * as privateAPI from '@app/routes/private/index.ts';
import type { App } from '@app/routes/type.ts';

export async function setup(app: App) {
  logger.debug('setup rest routes');

  // @ts-expect-error upstream bug
  app.decorateRequest('auth', null);

  await app.register(privateAPI.setup, { prefix: '/p1' });
  await app.register(demo.setup, { prefix: '/demo/' });

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
