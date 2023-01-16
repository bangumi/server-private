import type { FastifyError } from '@fastify/error';
import type { SchemaOptions, Static, TSchema } from '@sinclair/typebox';
import { Type as t, Type } from '@sinclair/typebox';
import httpCodes from 'http-status-codes';

import type * as orm from '@app/lib/orm';
import { avatar } from '@app/lib/response';
import * as Subject from '@app/lib/subject';

function NumberEnum<T extends number>(
  values: Readonly<Record<string, T>>,
  options: SchemaOptions = {},
) {
  const entries = Object.entries(values).sort((a, b) => a[1] - b[1]);

  return Type.Unsafe<T>({
    ...options,
    'x-enumNames': entries.map(([name]) => name),
    type: 'number',
    enum: entries.map((x) => x[1]),
  });
}

/** 不可以用 t.Ref */
export const SubjectType = NumberEnum(
  {
    Book: Subject.SubjectType.Book,
    Anime: Subject.SubjectType.Anime,
    Music: Subject.SubjectType.Music,
    Game: Subject.SubjectType.Game,
    Real: Subject.SubjectType.Real,
  },
  { $id: 'SubjectType', title: 'SubjectType' },
);

export type IAvatar = Static<typeof Avatar>;
export const Avatar = t.Object(
  {
    small: t.String(),
    medium: t.String({ examples: ['sai'] }),
    large: t.String(),
  },
  { $id: 'Avatar', title: 'Avatar' },
);

export type IUser = Static<typeof User>;
export const User = t.Object(
  {
    id: t.Integer({ examples: [1] }),
    username: t.String({ examples: ['sai'] }),
    nickname: t.String({ examples: ['Sai🖖'] }),
    avatar: Avatar,
    sign: t.String(),
    user_group: t.Integer(),
  },
  { $id: 'User', title: 'User' },
);

export const Topic = t.Object(
  {
    id: t.Integer({ description: 'topic id' }),
    creator: User,
    title: t.String(),
    parentID: t.Integer({ description: '小组/条目ID' }),
    createdAt: t.Integer({ description: '发帖时间，unix time stamp in seconds' }),
    updatedAt: t.Integer({ description: '最后回复时间，unix time stamp in seconds' }),
    repliesCount: t.Integer(),
  },
  { $id: 'Topic', title: 'Topic' },
);

export const Paged = <T extends TSchema>(type: T) =>
  t.Object({
    data: t.Array(type),
    total: t.Integer(),
  });

export const ValidationError = t.Object(
  {
    error: t.String(),
    message: t.String(),
    statusCode: t.Integer(),
  },
  { $id: 'ValidationError', description: `request data validation error` },
);

export const Error = t.Object(
  {
    code: t.String(),
    error: t.String(),
    message: t.String(),
    statusCode: t.Integer(),
  },
  { $id: 'Error', description: 'fastify default error response' },
);

export function formatError(e: FastifyError): Static<typeof Error> {
  const statusCode = e.statusCode ?? 500;
  return {
    code: e.code,
    error: httpCodes.getStatusText(statusCode),
    message: e.message,
    statusCode: statusCode,
  };
}

export function formatErrors(
  ...errors: FastifyError[]
): Record<string, { value: Static<typeof Error> }> {
  return Object.fromEntries(
    errors.map((e) => {
      return [e.code, { value: formatError(e) }];
    }),
  );
}

export function userToResCreator(user: orm.IUser): IUser {
  return {
    avatar: avatar(user.img),
    username: user.username,
    nickname: user.nickname,
    id: user.id,
    sign: user.sign,
    user_group: user.groupID,
  };
}
