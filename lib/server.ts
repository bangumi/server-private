import type Ajv from 'ajv';
import addFormats from 'ajv-formats';
import AltairFastify from 'altair-fastify-plugin';
import type { FastifyInstance, FastifyRequest, FastifyServerOptions } from 'fastify';
import { fastify } from 'fastify';
import metricsPlugin from 'fastify-metrics';
import mercurius from 'mercurius';
import { TypeORMError } from 'typeorm';

import * as routes from '@app/routes';

import { emptyAuth } from './auth';
import * as auth from './auth';
import { production, stage, testing, VERSION } from './config';
import type { Context } from './graphql/context';
import { schema } from './graphql/schema';
import { repo } from './orm';

export async function createServer(
  opts: Omit<FastifyServerOptions, 'ajv'> = {},
): Promise<FastifyInstance> {
  if (production || stage) {
    opts.requestIdHeader ??= 'cf-ray';
  }

  opts.onProtoPoisoning = 'error';

  const ajv: FastifyServerOptions['ajv'] = {
    plugins: [
      function (ajv: Ajv) {
        ajv.addKeyword({ keyword: 'x-examples' });
      },
      addFormats,
    ],
  };

  const server = fastify({ ...opts, ajv });

  server.setErrorHandler(function (error, request, reply) {
    // hide TypeORM message
    if (error instanceof TypeORMError) {
      this.log.error(error);
      void reply.status(500).send({
        error: 'Internal Server Error',
        message: 'internal database error, please contact admin',
        statusCode: 500,
      });
    } else {
      void reply.send(error);
    }
  });

  server.addHook('onRequest', (req, res, done) => {
    void res.header('x-server-version', VERSION);
    done();
  });

  server.decorateRequest('ip', {
    getter: function (this: FastifyRequest): string {
      const cfClientIp = this.headers['cf-connecting-ip'] as string | undefined;
      if (cfClientIp) {
        return cfClientIp;
      }

      return this.socket.remoteAddress ?? '0.0.0.0';
    },
  });

  if (!testing) {
    await server.register(metricsPlugin, {
      routeMetrics: {
        groupStatusCodes: true,
        overrides: {
          histogram: {
            buckets: [0.05, 0.1, 0.3, 0.5, 0.75, 1, 2, 3],
          },
        },
      },
    });
  }

  await server.register(mercurius, {
    schema,
    path: '/v0/graphql',
    graphiql: false,
    allowBatchedQueries: true,
    context: async (request: FastifyRequest): Promise<Context> => {
      const a = await auth.byHeader(request.headers.authorization);
      if (a) {
        return { repo, auth: a };
      }

      return { repo, auth: emptyAuth() };
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

  await server.register(routes.setup);

  return server;
}
