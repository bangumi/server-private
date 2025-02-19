import '@app/lib/sentry';

import * as console from 'node:console';
import * as crypto from 'node:crypto';
import * as process from 'node:process';

import * as Sentry from '@sentry/node';

import config, { production, stage } from '@app/lib/config.ts';
import { producer } from '@app/lib/kafka.ts';
import { logger } from '@app/lib/logger.ts';
import { AppDataSource } from '@app/lib/orm/index.ts';
import { Subscriber } from '@app/lib/redis.ts';
import { createServer } from '@app/lib/server.ts';

async function main() {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log('check ./lib/config.ts for all available env');
    // eslint-disable-next-line unicorn/no-process-exit
    process.exit();
  }

  const server = await createServer({
    loggerInstance: logger.child({ name: 'fastify' }, { level: production ? 'warn' : 'info' }),
    disableRequestLogging: process.env.ENABLE_REQUEST_LOGGING !== 'true',
    genReqId:
      production || stage
        ? (req) => {
            return (req.headers['x-request-id'] as string) ?? `dummy-prod-${crypto.randomUUID()}`;
          }
        : (): string => {
            return `dummy-${crypto.randomUUID()}`;
          },
  });

  if (config.sentryDSN) {
    Sentry.setupFastifyErrorHandler(server);
  }

  server.addHook('onReady', async () => {
    await Promise.all([
      producer.initialize(),
      Subscriber.psubscribe(`event-user-notify-*`),
      AppDataSource.initialize(),
    ]);
  });

  const { host, port } = config.server;
  await server.listen({ port: port, host: host });

  logger.info(`GraphQL UI  http://127.0.0.1:${port}/v0/altair/`);
  logger.info(`private API http://127.0.0.1:${port}/p1/`);
  logger.info(`demo        http://127.0.0.1:${port}/demo/`);
  logger.info(`admin       http://127.0.0.1:${port}/demo/admin/`);
  logger.info(`oauth       http://127.0.0.1:${port}/oauth/authorize`);
  logger.flush();
}

await main();
