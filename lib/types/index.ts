import type { FastifyError } from '@fastify/error';
import type { Static, TSchema } from '@sinclair/typebox';
import { Type as t } from '@sinclair/typebox';
import httpCodes from 'http-status-codes';

export type IUser = Static<typeof User>;
export const User = t.Object(
  {
    id: t.Integer({ examples: [1] }),
    username: t.String({ examples: ['sai'] }),
    nickname: t.String({ examples: ['Sai🖖'] }),
  },
  { $id: 'User', title: 'User' },
);

const Avatar = t.Object(
  {
    small: t.String(),
    medium: t.String({ examples: ['sai'] }),
    large: t.String(),
  },
  { $id: 'Avatar', title: 'Avatar' },
);

export const Creator = t.Object(
  {
    id: t.Integer({ examples: [1] }),
    username: t.String({ examples: ['sai'] }),
    avatar: Avatar,
    nickname: t.String({ examples: ['Sai🖖'] }),
  },
  { $id: 'Creator', title: 'Creator', description: 'a slim user object to contain basic info' },
);

export const Topic = t.Object(
  {
    id: t.Integer({ description: 'topic id' }),
    creator: Creator,
    parentID: t.Integer({ description: '小组/条目ID' }),
    lastRepliedAt: t.String({ description: '最后回复时间，unix time stamp', format: 'date-time' }),
  },
  { $id: 'Topic', title: 'Topic' },
);

export const Paged = <T extends TSchema>(type: T) =>
  t.Object({
    data: t.Array(type),
    total: t.Integer(),
  });

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
