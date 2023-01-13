import { createError } from '@fastify/error';
import httpCodes from 'http-status-codes';

export const FileExistError = createError(
  'FILE_EXIST_ERROR',
  'uploaded file already exists',
  httpCodes.BAD_REQUEST,
);
