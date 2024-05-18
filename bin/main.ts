import * as console from 'node:console';
import * as crypto from 'node:crypto';
import * as process from 'node:process';

import config, { production } from '@app/lib/config.ts';
import { logger } from '@app/lib/logger.ts';
import { AppDataSource } from '@app/lib/orm/index.ts';
import { Subscriber } from '@app/lib/redis.ts';
import { createServer } from '@app/lib/server.ts';

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  // eslint-disable-next-line no-console
  console.log('check ./lib/config.ts for all available env');
  // eslint-disable-next-line n/no-process-exit,unicorn/no-process-exit
  process.exit();
}

const server = await createServer({
  logger: logger.child({ name: 'fastify' }, { level: production ? 'warn' : 'info' }),
  disableRequestLogging: process.env.ENABLE_REQUEST_LOGGING !== 'true',
  genReqId: (): string => {
    return `dummy-${crypto.randomUUID()}`;
  },
});

server.addHook('onReady', async () => {
  await Promise.all([Subscriber.psubscribe(`event-user-notify-*`), AppDataSource.initialize()]);
});

const { host, port } = config.server;
await server.listen({ port: port, host: host });

logger.info(`GraphQL UI  http://127.0.0.1:${port}/v0/altair/`);
logger.info(`private API http://127.0.0.1:${port}/p1/`);
logger.info(`demo        http://127.0.0.1:${port}/demo/`);
logger.info(`admin       http://127.0.0.1:${port}/demo/admin/`);
logger.info(`oauth       http://127.0.0.1:${port}/oauth/authorize`);
logger.flush();
