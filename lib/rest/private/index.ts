import Cookie from '@fastify/cookie';

import * as auth from '../../auth';
import prisma from '../../prisma';
import * as login from './routes/login';
import * as me from '../routes/me';
import * as swagger from '../swagger';
import type { App } from '../type';

export async function setup(app: App) {
  await swagger.privateAPI(app);

  await app.register(Cookie, {
    hook: 'preHandler', // set to false to disable cookie autoparsing or set autoparsing on any of the following hooks: 'onRequest', 'preParsing', 'preHandler', 'preValidation'. default: 'onRequest'
    parseOptions: {}, // options for parsing cookies
  });

  void app.addHook('preHandler', async (req) => {
    if (req.cookies.sessionID) {
      const session = await prisma.chii_os_web_sessions.findFirst({
        where: { key: req.cookies.sessionID },
      });
      if (!session) {
        return;
      }
      const a = await auth.byUserID(session.user_id);

      req.user = a.user;
      req.auth = a;
    }
  });

  await app.register(login.setup);
  await app.register(me.setup);
}
