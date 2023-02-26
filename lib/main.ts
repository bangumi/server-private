import { nanoid } from 'nanoid';

import config, { production } from './config';
import { logger } from './logger.ts';
import { AppDataSource } from './orm';
import { Subscriber } from './redis.ts';
import { createServer } from './server.ts';
import { intval } from './utils';


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
    return `dummy-ray-${nanoid()}`;
  },
});

server.addHook('onReady', async () => {
  await Subscriber.psubscribe(`event-user-notify-*`);
  await AppDataSource.initialize();
});

await server.listen({ port: config.port, host: config.host });

logger.info(`GraphQL UI  http://127.0.0.1:${config.port}/v0/altair/`);
logger.info(`public API  http://127.0.0.1:${config.port}/v0.5/`);
logger.info(`private API http://127.0.0.1:${config.port}/p1/`);
logger.info(`demo        http://127.0.0.1:${config.port}/demo/`);
logger.info(`admin       http://127.0.0.1:${config.port}/demo/admin/`);
