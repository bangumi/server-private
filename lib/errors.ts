import { createError } from '@fastify/error';
import httpCodes from 'http-status-codes';

export const NotFoundError = createError('NOT_FOUND', '%s not found', httpCodes.NOT_FOUND);
