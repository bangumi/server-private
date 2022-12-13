import AltairFastify from 'altair-fastify-plugin';
import type { FastifyInstance, FastifyRequest, FastifyServerOptions } from 'fastify';
import { fastify } from 'fastify';
import metricsPlugin from 'fastify-metrics';
import mercurius from 'mercurius';
import { register } from 'prom-client';

import { emptyAuth } from './auth';
import * as auth from './auth';
import { production, stage, testing } from './config';
import type { Context } from './graphql/context';
import { schema } from './graphql/schema';
import prisma from './prisma';
import * as rest from './rest';

declare module 'fastify' {
  interface FastifyRequest {
    // use clientIp privided by cloudflare
    clientIP: string;
  }
}

export async function createServer(opts: FastifyServerOptions = {}): Promise<FastifyInstance> {
  if (production || stage) {
    opts.requestIdHeader ??= 'cf-ray';
  }

  const server = fastify(opts);

  server.decorateRequest('clientIP', '');

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
    server.get('/metrics', async (_req, res) => {
      const prismaMetrics = await prisma.$metrics.prometheus();
      const appMetrics = await register.metrics();
      return res.send(appMetrics + prismaMetrics);
    });

    await server.register(metricsPlugin, {
      endpoint: null,
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
        return { prisma, auth: a };
      }

      return { prisma, auth: emptyAuth() };
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
