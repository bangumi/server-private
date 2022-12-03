import { createServer } from './server';

const server = createServer({
  logger: { level: 'info' },
  disableRequestLogging: process.env.ENABLE_REQUEST_LOGGING !== 'true',
});

const port = 4000;
await server.listen({ port, host: '0.0.0.0' });
