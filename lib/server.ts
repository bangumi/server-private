import type { FastifyInstance, FastifyRequest, FastifyServerOptions } from 'fastify';
import mercurius from 'mercurius';
import AltairFastify from 'altair-fastify-plugin';
import { createError } from '@fastify/error';
import { fastify } from 'fastify';

import { schema } from './graphql/schema';
import type { Context } from './graphql/context';
import prisma from './prisma';
import * as auth from './auth';

const HeaderInvalid = createError('AUTHORIZATION_INVALID', '%s', 401);

export function createServer(opts: FastifyServerOptions = {}): FastifyInstance {
  const server = fastify(opts);

  server.register(mercurius, {
    schema,
    path: '/v0/graphql',
    graphiql: false,
    context: async (request: FastifyRequest): Promise<Context> => {
      const key = request.headers.authorization;
      if (Array.isArray(key)) {
        throw new HeaderInvalid("can't providing multiple access token");
      }
      if (!key) {
        return { prisma, user: { login: false, permission: {}, allowNsfw: false } };
      }
      if (!key.startsWith('Bearer ')) {
        throw new HeaderInvalid('authorization header should have "Bearer ${TOKEN}" format');
      }

      return {
        prisma,
        user: await auth.byToken(key.slice('Bearer '.length)),
      };
    },
  });
  // @ts-ignore
  server.register(AltairFastify, {
    path: '/v0/altair/',
    baseURL: '/v0/altair/',
    endpointURL: '/v0/graphql',
    initialSettings: {
      theme: 'dark',
      plugin: {
        list: ['altair-graphql-plugin-graphql-explorer'],
      },
    },
  });

  return server;
}
