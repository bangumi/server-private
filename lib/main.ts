import { nanoid } from 'nanoid';

import { production } from './config';
import { logger } from './logger';
import { createServer } from './server';

const server = await createServer({
  logger: logger.child({ name: 'fastify' }, { level: production ? 'warn' : 'info' }),
  disableRequestLogging: process.env.ENABLE_REQUEST_LOGGING !== 'true',
  genReqId: (): string => {
    return `dummy-ray-${nanoid()}`;
  },
});

const port = process.env.PORT ? Number.parseInt(process.env.PORT) : 4000;
const host = process.env.HOST ?? '0.0.0.0';

await server.listen({ port, host });

logger.info(`GraphQL UI  http://127.0.0.1:${port}/v0/altair/`);
logger.info(`public API  http://127.0.0.1:${port}/v0.5/`);
logger.info(`private API http://127.0.0.1:${port}/p1/`);
