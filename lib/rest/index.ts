import type { FastifyInstance } from 'fastify';

import type { IAuth } from '../auth';
import { logger } from '../logger';
import type { IUser } from '../orm';
import * as privateAPI from './private';
import * as publicAPI from './public';

export async function setup(app: FastifyInstance) {
  logger.debug('setup rest routes');

  app.decorateRequest('user', null);
  app.decorateRequest('auth', null);

  await app.register(privateAPI.setup, { prefix: '/p1' });
  await app.register(publicAPI.setup, { prefix: '/v0.5' });
}

declare module 'fastify' {
  interface FastifyRequest {
    auth: IAuth;
    user: IUser | null;
  }
}
