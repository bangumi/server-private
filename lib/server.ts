import type { Static } from '@sinclair/typebox';
import type Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { DrizzleError } from 'drizzle-orm';
import type { FastifyInstance, FastifyRequest, FastifyServerOptions } from 'fastify';
import { fastify } from 'fastify';
import type { FastifySchemaValidationError } from 'fastify/types/schema.d.ts';
import metricsPlugin from 'fastify-metrics';
import mercurius from 'mercurius';
import { TypeORMError } from 'typeorm';

import { fastifyAltairPlugin } from '@app/lib/graphql/ui.ts';
import * as routes from '@app/routes/index.ts';

import { emptyAuth } from './auth/index.ts';
import * as auth from './auth/index.ts';
import config, { testing, VERSION } from './config.ts';
import type { Context } from './graphql/context.ts';
import { resolvers, schema } from './graphql/schema.ts';
import { repo } from './orm/index.ts';
import type * as res from './types/res.ts';

export function defaultSchemaErrorFormatter(
  errors: FastifySchemaValidationError[],
  dataVar: string,
): Error & Static<typeof res.Error> {
  let text = '';
  const separator = ', ';

  for (const e of errors) {
    text += `${dataVar}${e.instancePath} ${e.message ?? ''}${separator}`;
  }
  return new ValidationError(text.slice(0, -separator.length));
}

class ValidationError extends Error {
  code = 'REQUEST_VALIDATION_ERROR';
  error = 'Bad Request';
  statusCode = 400;

  constructor(msg: string) {
    super(msg);
    this.message = msg;
  }
}

export async function createServer(
  opts: Omit<
    FastifyServerOptions,
    'onProtoPoisoning' | 'ajv' | 'schemaErrorFormatter' | 'requestIdHeader'
  > = {},
): Promise<FastifyInstance> {
  const ajv: FastifyServerOptions['ajv'] = {
    plugins: [
      function (ajv: Ajv) {
        ajv.addKeyword({ keyword: 'x-examples' });
      },
      addFormats,
    ],
  };

  const server = fastify({
    ...opts,
    onProtoPoisoning: 'error',
    ajv,
    bodyLimit: 8 * 1024 * 1024,
    requestIdHeader: config.server.requestIDHeader,
    schemaErrorFormatter: defaultSchemaErrorFormatter,
  });

  server.setErrorHandler(function (error, request, reply) {
    // hide TypeORM message
    if (error instanceof TypeORMError || error instanceof DrizzleError) {
      this.log.error(error);
      void reply.status(500).send({
        error: 'Internal Server Error',
        message: 'internal database error, please contact admin',
        statusCode: 500,
      });
    } else {
      if (typeof error.statusCode !== 'number' || error.statusCode === 500) {
        this.log.error(error);
        void reply.status(500).send({
          error: 'Internal Server Error',
          message: 'internal error, please contact admin',
          statusCode: 500,
        });
      } else {
        void reply.send(error);
      }
    }
  });

  server.addHook('onRequest', (req, res, done) => {
    void res.header('x-server-version', VERSION);
    done();
  });

  const clientIpHeader = config.server.clientIpHeader;

  server.decorateRequest('ip', {
    getter: function (this: FastifyRequest): string {
      const hRealIp = this.headers[clientIpHeader] as string | undefined;
      if (hRealIp) {
        return hRealIp;
      }

      return this.socket.remoteAddress ?? '127.0.0.1';
    },
  });

  if (!testing) {
    await server.register(metricsPlugin, {
      routeMetrics: {
        groupStatusCodes: false,
        overrides: {
          histogram: {
            buckets: [0.05, 0.1, 0.2, 0.3, 0.5, 0.75, 1, 2, 3],
          },
        },
      },
    });
  }

  await server.register(mercurius, {
    schema,
    resolvers,
    path: '/v0/graphql',
    jit: 200,
    queryDepth: 5,
    allowBatchedQueries: true,
    context: async (request: FastifyRequest): Promise<Context> => {
      const a = await auth.byHeader(request.headers.authorization);
      if (a) {
        return { repo, auth: a };
      }

      return { repo, auth: emptyAuth() };
    },
  });

  await server.register(fastifyAltairPlugin, {
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
