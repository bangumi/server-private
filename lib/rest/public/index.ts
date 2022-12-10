import type { FastifyInstance } from 'fastify';

import * as auth from '../../auth';
import { emptyAuth } from '../../auth';
import * as me from '../routes/me';
import * as swagger from '../swagger';
import * as userApi from './routes/user';

export async function setup(app: FastifyInstance) {
  await swagger.publicAPI(app);

  void app.addHook('preHandler', async (req) => {
    if (!req.headers.authorization) {
      req.user = null;
      req.auth = emptyAuth();
      return;
    }

    const a = await auth.byHeader(req.headers.authorization);
    req.user = a.user;
    req.auth = a;
  });

  await app.register(userApi.setup);
  await app.register(me.setup);
}
