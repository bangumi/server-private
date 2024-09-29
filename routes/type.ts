import type { IncomingMessage, ServerResponse } from 'node:http';

import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import type {
  ContextConfigDefault,
  FastifyBaseLogger,
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
  FastifySchema,
  RawReplyDefaultExpression,
  RawRequestDefaultExpression,
  RawServerDefault,
  RouteGenericInterface,
  RouteHandlerMethod,
} from 'fastify';
import type { ResolveFastifyRequestType } from 'fastify/types/type-provider.d.ts';

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

export type Request<schema extends FastifySchema> = FastifyRequest<
  RouteGenericInterface,
  RawServerDefault,
  RawRequestDefaultExpression,
  schema,
  TypeBoxTypeProvider,
  ContextConfigDefault,
  FastifyBaseLogger,
  ResolveFastifyRequestType<TypeBoxTypeProvider, schema, RouteGenericInterface>
>;

export type Reply<schema extends FastifySchema> = FastifyReply<
  RouteGenericInterface,
  RawServerDefault,
  RawRequestDefaultExpression,
  RawReplyDefaultExpression,
  ContextConfigDefault,
  schema,
  TypeBoxTypeProvider
>;

export type Handler<schema extends FastifySchema> = RouteHandlerMethod<
  RawServerDefault,
  RawRequestDefaultExpression,
  RawReplyDefaultExpression,
  RouteGenericInterface,
  ContextConfigDefault,
  schema,
  TypeBoxTypeProvider
>;
