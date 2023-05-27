import { createError } from '@fastify/error';
import httpCodes, { StatusCodes } from 'http-status-codes';

export const BadRequestError = createError<[string]>('BAD_REQUEST', '%s', StatusCodes.BAD_REQUEST);
export const NotFoundError = createError<[string]>(
  'NOT_FOUND',
  '%s not found',
  httpCodes.NOT_FOUND,
);
export const UnexpectedNotFoundError = createError<[string]>(
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
