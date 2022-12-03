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

const port = 4000;
await server.listen({ port, host: '0.0.0.0' });
logger.info('server started at http://0.0.0.0:4000');
logger.info('visit http://127.0.0.1:4000/v0/altair/');
