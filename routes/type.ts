import type { IncomingMessage, ServerResponse } from 'node:http';

import type { Static, TSchema } from '@sinclair/typebox';
import type {
  ContextConfigDefault,
  FastifyBaseLogger,
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
  FastifySchema,
  FastifyTypeProvider,
  RawReplyDefaultExpression,
  RawRequestDefaultExpression,
  RawServerDefault,
  RouteGenericInterface,
  RouteHandlerMethod,
} from 'fastify';
import type { ResolveFastifyRequestType } from 'fastify/types/type-provider';

// from https://github.com/fastify/fastify-type-provider-typebox/blob/v3.1.0/index.ts#L56
export interface TypeBoxTypeProvider extends FastifyTypeProvider {
  output: this['input'] extends TSchema ? Static<this['input']> : never;
}

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
  RawServerDefault,
  RawRequestDefaultExpression,
  RawReplyDefaultExpression,
  RouteGenericInterface,
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
