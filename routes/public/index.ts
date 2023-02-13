import type { FastifyInstance } from 'fastify';

import * as auth from '@app/lib/auth';
import { emptyAuth } from '@app/lib/auth';
import * as me from '@app/routes/routes/me.ts';
import * as swagger from '@app/routes/swagger.ts';

import * as userApi from './routes/user.ts';

export async function setup(app: FastifyInstance) {
  await swagger.publicAPI(app);

  void app.addHook('preHandler', async (req) => {
    if (!req.headers.authorization) {
      req.auth = emptyAuth();
      return;
    }

    const a = await auth.byHeader(req.headers.authorization);
    if (!a) {
      req.auth = emptyAuth();
      return;
    }
    req.auth = a;
  });

  await app.register(userApi.setup);
  await app.register(me.setup);
}
