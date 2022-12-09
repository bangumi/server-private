import type { IncomingMessage, ServerResponse } from 'node:http';

import type { FastifyInstance } from 'fastify';
import type { RawServerDefault } from 'fastify/types/utils';
import type { FastifyBaseLogger } from 'fastify/types/logger';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';

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
