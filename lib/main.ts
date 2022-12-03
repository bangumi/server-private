import { nanoid } from 'nanoid';

import { createServer } from './server';
import { logger } from './logger';

const server = createServer({
  logger: logger.child({ name: 'fastify' }, { level: 'warn' }),
  disableRequestLogging: process.env.ENABLE_REQUEST_LOGGING !== 'true',
  genReqId: (req): string => {
    if (!req.headers.cf_ray) {
      return nanoid();
    }

    if (Array.isArray(req.headers.cf_ray)) {
      return req.headers.cf_ray.join(';');
    }

    return req.headers.cf_ray;
  },
});

const port = process.env.PORT ? parseInt(process.env.PORT) : 4000;
const host = process.env.HOST ?? '0.0.0.0';

await server.listen({ port, host });

logger.info(`server started at http://${host}:${port}`);
logger.info(`visit http://127.0.0.1:${port}/v0/altair/`);
