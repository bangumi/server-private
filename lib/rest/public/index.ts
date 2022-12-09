import type { FastifyInstance } from 'fastify';

import * as auth from '../../auth';
import * as me from '../routes/me';
import * as userApi from './routes/user';
import * as swagger from '../swagger';

export async function setup(app: FastifyInstance) {
  await swagger.publicAPI(app);

  void app.addHook('preHandler', async (req) => {
    if (req.headers.authorization) {
      const a = await auth.byHeader(req.headers.authorization);
      req.user = a.user;
      req.auth = a;
    }
  });

  await app.register(userApi.setup);
  await app.register(me.setup);
}
