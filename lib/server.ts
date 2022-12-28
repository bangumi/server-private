import type Ajv from 'ajv';
import AltairFastify from 'altair-fastify-plugin';
import type { FastifyInstance, FastifyRequest, FastifyServerOptions } from 'fastify';
import { fastify } from 'fastify';
import metricsPlugin from 'fastify-metrics';
import mercurius from 'mercurius';
import { TypeORMError } from 'typeorm/error/TypeORMError';

import { emptyAuth } from './auth';
import * as auth from './auth';
import { production, stage, testing, VERSION } from './config';
import type { Context } from './graphql/context';
import { schema } from './graphql/schema';
import { repo } from './orm';
import * as rest from './rest';

declare module 'fastify' {
  interface FastifyRequest {
    // use clientIp provided by cloudflare
    clientIP: string;
  }
}

export async function createServer(opts: FastifyServerOptions = {}): Promise<FastifyInstance> {
  if (production || stage) {
    opts.requestIdHeader ??= 'cf-ray';
  }

  opts.onProtoPoisoning = 'error';

  if (opts.ajv?.plugins?.length) {
    opts.ajv.plugins.push(function (ajv: Ajv) {
      ajv.addKeyword({ keyword: 'x-examples' });
    });
  } else {
    opts.ajv = {
      plugins: [
        function (ajv: Ajv) {
          ajv.addKeyword({ keyword: 'x-examples' });
        },
      ],
    };
  }

  const server = fastify(opts);

  server.setErrorHandler(function (error, request, reply) {
    // hide TypeORM message
    if (error instanceof TypeORMError) {
      // Log error
      this.log.error(error);
      // Send error response
      void reply.status(500).send({
        error: 'Internal Server Error',
        message: 'internal database error, please contact admin',
        statusCode: 500,
      });

      return;
    }

    return error;
  });

  server.decorateRequest('clientIP', '');

  server.addHook('onRequest', (req, res, done) => {
    void res.header('x-server-version', VERSION);
    done();
  });

  // eslint-disable-next-line @typescript-eslint/require-await
  server.addHook('preHandler', async (req) => {
    const cfClientIp = req.headers['cf-connecting-ip'] as string | undefined;
    if (cfClientIp) {
      req.clientIP = cfClientIp;
      return;
    }

    req.clientIP = req.ip;
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

  await server.register(rest.setup);

  return server;
}
