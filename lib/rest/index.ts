import type { FastifyInstance } from 'fastify';

import * as me from './me';
import type { IAuth, IUser } from '../auth';
import * as auth from '../auth';

export function setup(app: FastifyInstance) {
  app.addHook('preHandler', async (req) => {
    const a = await auth.byHeader(req.headers.authorization);
    req.user = a.user;
    req.auth = a;
  });

  me.setup(app);

  return app;
}

declare module 'fastify' {
  interface FastifyRequest {
    auth: IAuth;
    user: IUser | null;
  }
}
