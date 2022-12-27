import type { FastifyError } from '@fastify/error';
import { createError } from '@fastify/error';
import httpCodes, { StatusCodes } from 'http-status-codes';

/** Type helper to make message argument as required */
export interface SingleMessageErrorConstructor {
  new (msg: string): FastifyError & { statusCode: number };
  (msg: string): FastifyError & { statusCode: number };
}

export const BadRequestError: SingleMessageErrorConstructor = createError(
  'BAD_REQUEST',
  '%s',
  StatusCodes.BAD_REQUEST,
);
export const NotFoundError: SingleMessageErrorConstructor = createError(
  'NOT_FOUND',
  '%s not found',
  httpCodes.NOT_FOUND,
);
export const UnexpectedNotFoundError: SingleMessageErrorConstructor = createError(
  'UNEXPECTED_NOT_FOUND',
  '%s not found',
  500,
);

export class UnimplementedError extends Error {
  constructor(msg: string) {
    super('TODO: ' + msg);
  }
}

export class UnreachableError extends Error {}
