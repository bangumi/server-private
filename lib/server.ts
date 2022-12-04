import type { FastifyInstance, FastifyRequest, FastifyServerOptions } from 'fastify';
import { fastify } from 'fastify';
import mercurius from 'mercurius';
import AltairFastify from 'altair-fastify-plugin';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';

import { schema } from './graphql/schema';
import type { Context } from './graphql/context';
import prisma from './prisma';
import * as auth from './auth';
import * as rest from './rest';
import { pkg } from './config';

export async function createServer(opts: FastifyServerOptions = {}): Promise<FastifyInstance> {
  const server = fastify(opts);

  server.register(mercurius, {
    schema,
    path: '/v0/graphql',
    graphiql: false,
    allowBatchedQueries: true,
    context: async (request: FastifyRequest): Promise<Context> => {
      return {
        prisma,
        auth: await auth.byHeader(request.headers.authorization),
      };
    },
  });

  server.register(AltairFastify, {
    path: '/v0/altair/',
    baseURL: '/v0/altair/',
    endpointURL: '/v0/graphql',
    initialSettings: {
      theme: 'dark',
      'plugin.list': ['altair-graphql-plugin-graphql-explorer'],
    },
  });

  await server.register(swagger, {
    openapi: {
      info: {
        version: pkg.version,
        title: 'hello',
      },
    },
  });

  await server.register(swaggerUI, {
    routePrefix: '/documentation',
    uiConfig: {
      deepLinking: true,
      layout: 'BaseLayout',
    },
  });

  await server.register(rest.setup, { prefix: '/v1' });

  return server;
}
