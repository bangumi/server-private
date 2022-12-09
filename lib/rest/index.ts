import type { FastifyInstance } from 'fastify';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import Cookie from '@fastify/cookie';

import type { IAuth } from '../auth';
import * as auth from '../auth';
import { logger } from '../logger';
import type { IUser } from '../orm';
import { ErrorRes, User } from '../types';
import prisma from '../prisma';
import * as login from './api/login';
import * as me from './api/me';

export async function setup(app: FastifyInstance) {
  app.addSchema(User);
  app.addSchema(ErrorRes);

  app.decorateRequest('user', null);
  app.decorateRequest('auth', null);

  await app.register(Cookie, {
    hook: 'preHandler', // set to false to disable cookie autoparsing or set autoparsing on any of the following hooks: 'onRequest', 'preParsing', 'preHandler', 'preValidation'. default: 'onRequest'
    parseOptions: {}, // options for parsing cookies
  });

  logger.debug('setup rest routes');

  void app.addHook('preHandler', async (req) => {
    if (req.headers.authorization) {
      const a = await auth.byHeader(req.headers.authorization);
      req.user = a.user;
      req.auth = a;

      return;
    }

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

  const server = app.withTypeProvider<TypeBoxTypeProvider>();

  login.setup(server);
  me.setup(server);

  return app;
}

declare module 'fastify' {
  interface FastifyRequest {
    auth: IAuth;
    user: IUser | null;
  }
}
