import type { FastifyInstance } from 'fastify';

import type { IAuth } from '@app/lib/auth';
import { logger } from '@app/lib/logger';

import * as demo from './demo';
import * as privateAPI from './private';
import * as publicAPI from './public';

export async function setup(app: FastifyInstance) {
  logger.debug('setup rest routes');

  app.decorateRequest('auth', null);

  await app.register(privateAPI.setup, { prefix: '/p1' });
  await app.register(publicAPI.setup, { prefix: '/v0.5' });
  await app.register(demo.setup, { prefix: '/demo/' });

  app.get('/img/*', (req, res) => {
    return res.redirect('https://bgm.tv' + req.url);
  });
}

declare module 'fastify' {
  interface FastifyRequest {
    auth: Readonly<IAuth>;
  }
}
