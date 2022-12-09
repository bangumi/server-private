import type { FastifyError } from '@fastify/error';
import type { Static } from '@sinclair/typebox';
import { Type as t } from '@sinclair/typebox';
import httpCodes from 'http-status-codes';

export type IUser = Static<typeof User>;
export const User = t.Object(
  {
    ID: t.Integer({ examples: [1] }),
    username: t.String({ examples: ['sai'] }),
    nickname: t.String({ examples: ['Sai🖖'] }),
  },
  { $id: 'User', title: 'User' },
);

export const ErrorRes = t.Object(
  {
    code: t.String(),
    error: t.String(),
    message: t.String(),
    statusCode: t.Integer(),
  },
  { $id: 'Error', description: 'fastify default error response' },
);

export function formatError(e: FastifyError): Static<typeof ErrorRes> {
  const statusCode = e.statusCode ?? 500;
  return {
    code: e.code,
    error: httpCodes.getStatusText(statusCode),
    message: e.message,
    statusCode: statusCode,
  };
}
