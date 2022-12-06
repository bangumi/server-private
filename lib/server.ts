import * as fs from 'node:fs';
import * as path from 'node:path';

import type { FastifyInstance, FastifyRequest, FastifyServerOptions } from 'fastify';
import { fastify } from 'fastify';
import mercurius from 'mercurius';
import AltairFastify from 'altair-fastify-plugin';
import swagger from '@fastify/swagger';
import type { OpenAPIV3 } from 'openapi-types';

import { schema } from './graphql/schema';
import type { Context } from './graphql/context';
import prisma from './prisma';
import * as auth from './auth';
import * as rest from './rest';
import { pkg, projectRoot } from './config';
import { Security } from './openapi';

export async function createServer(opts: FastifyServerOptions = {}): Promise<FastifyInstance> {
  const server = fastify(opts);

  await server.register(mercurius, {
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

  await server.register(AltairFastify, {
    path: '/v0/altair/',
    baseURL: '/v0/altair/',
    endpointURL: '/v0/graphql',
    initialSettings: {
      theme: 'dark',
      'plugin.list': ['altair-graphql-plugin-graphql-explorer'],
    },
  });

  const swaggerUI = fs.readFileSync(path.join(projectRoot, './lib/swagger.html'));

  server.get('/v0.5/', (_, res) => {
    void res.type('text/html').send(swaggerUI);
  });

  server.get('/v0.5/openapi.json', () => {
    return server.swagger();
  });

  const openapi: Partial<OpenAPIV3.Document> = {
    info: {
      version: pkg.version,
      title: 'hello',
    },
    components: {
      securitySchemes: {
        [Security.OptionalHTTPBearer]: {
          type: 'http',
          description:
            '不强制要求用户认证，但是可能看不到某些敏感内容内容（如 NSFW 或者仅用户自己可见的收藏）',
          scheme: 'Bearer',
        },
        [Security.HTTPBearer]: {
          type: 'http',
          description: '需要使用 access token 进行认证',
          scheme: 'Bearer',
        },
      },
    },
  };

  await server.register(swagger, {
    openapi,
  });

  await server.register(rest.setup, { prefix: '/v0.5' });

  return server;
}
