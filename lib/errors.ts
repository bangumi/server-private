import { createError } from '@fastify/error';
import httpCodes from 'http-status-codes';

export const NotFoundError = createError('NOT_FOUND', '%s not found', httpCodes.NOT_FOUND);

export const UnexpectedNotFoundError = createError('UNEXPECTED_NOT_FOUND', '%s not found', 500);
