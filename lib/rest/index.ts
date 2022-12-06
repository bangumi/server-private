import * as url from 'node:url';
import * as path from 'node:path';

import type { FastifyInstance } from 'fastify';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import Cookie from '@fastify/cookie';

import { projectRoot } from '../config';
import type { IAuth } from '../auth';
import * as auth from '../auth';
import { ErrorRes, User } from '../types/user';
import { walk } from '../utils';
import type { App } from './type';
import prisma from '../prisma';
import type { IUser } from '../orm';

const setups: ((app: App) => void)[] = [];

for await (const file of walk(path.resolve(projectRoot, 'lib/rest/api'))) {
  if (!file.endsWith('.ts')) {
    continue;
  }

  if (file.endsWith('.test.ts')) {
    continue;
  }

  const api = (await import(url.pathToFileURL(file).toString())) as {
    setup?: (app: FastifyInstance) => void;
  };
  const setup = api.setup;
  if (setup) {
    setups.push(setup);
  }
}

export function setup(app: FastifyInstance) {
  app.addSchema(User);
  app.addSchema(ErrorRes);

  void app.register(Cookie, {
    hook: 'preHandler', // set to false to disable cookie autoparsing or set autoparsing on any of the following hooks: 'onRequest', 'preParsing', 'preHandler', 'preValidation'. default: 'onRequest'
    parseOptions: {}, // options for parsing cookies
  });

  app.addHook('preHandler', async (req) => {
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
  for (const setup of setups) {
    setup(server);
  }

  return app;
}

declare module 'fastify' {
  interface FastifyRequest {
    auth: IAuth;
    user: IUser | null;
  }
}
