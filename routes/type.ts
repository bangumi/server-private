import type { IncomingMessage, ServerResponse } from 'node:http';

import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import type { FastifyBaseLogger, FastifyInstance, RawServerDefault } from 'fastify';

export type App = FastifyInstance<
  RawServerDefault,
  IncomingMessage,
  ServerResponse,
  FastifyBaseLogger,
  TypeBoxTypeProvider
>;

export interface Option {
  tags?: string[];
}
