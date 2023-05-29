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

/** Feature not implemented yet. */
export class UnimplementedError extends Error {
  code = 'UNIMPLEMENTED_FEATURE_ERROR';

  constructor(msg: string) {
    super('TODO: ' + msg);
    this.name = this.constructor.name;
  }
}

/**
 * Code path not expected to run.
 *
 * Help TypeScript type narrow
 */
export class UnreachableError extends Error {
  code = 'UNREACHABLE_ERROR';

  constructor(msg: string) {
    super('TODO: ' + msg);
    this.name = this.constructor.name;
  }
}
