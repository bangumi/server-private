import type { IncomingMessage, ServerResponse } from 'node:http';

import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import type { FastifyInstance } from 'fastify';
import type { FastifyBaseLogger } from 'fastify/types/logger';
import type { RawServerDefault } from 'fastify/types/utils';

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
