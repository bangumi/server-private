import type { WikiMap } from '@bgm38/wiki';
import { parseToMap as parseWiki, WikiSyntaxError } from '@bgm38/wiki';
import type { FastifyError } from '@fastify/error';
import type { Static, TSchema } from '@sinclair/typebox';
import { Type as t } from '@sinclair/typebox';
import httpCodes from 'http-status-codes';
import * as lo from 'lodash-es';

import type * as orm from '@app/lib/orm/index.ts';
import { avatar } from '@app/lib/response.ts';
import * as Subject from '@app/lib/subject/index.ts';

export const SubjectType = t.Enum(Subject.SubjectType, {
  $id: 'SubjectType',
  title: 'SubjectType',
});

export enum EpisodeType {
  /** 本篇 */
  Normal = 0,
  /** 特别篇 */
  Special = 1,
  Op = 2,
  ED = 3,
  /** 预告/宣传/广告 */
  Pre = 4,
  MAD = 5,
  Other = 6,
}

export type IInfoboxValue = Static<typeof InfoboxValue>;
export const InfoboxValue = t.Object(
  {
    k: t.Optional(t.String()),
    v: t.String(),
  },
  { $id: 'InfoboxValue', title: 'InfoboxValue' },
);

export type IInfobox = Static<typeof Infobox>;
export const Infobox = t.Record(t.String(), t.Array(InfoboxValue), {
  $id: 'Infobox',
  title: 'Infobox',
});

export type ISubjectAirtime = Static<typeof SubjectAirtime>;
export const SubjectAirtime = t.Object(
  {
    date: t.String(),
    month: t.Integer(),
    weekday: t.Integer(),
    year: t.Integer(),
  },
  { $id: 'SubjectAirtime', title: 'SubjectAirtime' },
);

export type ISubjectCollection = Static<typeof SubjectCollection>;
export const SubjectCollection = t.Record(t.String(), t.Integer(), {
  $id: 'SubjectCollection',
  title: 'SubjectCollection',
});

export type ISubjectPlatform = Static<typeof SubjectPlatform>;
export const SubjectPlatform = t.Object(
  {
    id: t.Integer(),
    type: t.String(),
    typeCN: t.String(),
    alias: t.String(),
    order: t.Optional(t.Integer()),
    enableHeader: t.Optional(t.Boolean()),
    wikiTpl: t.Optional(t.String()),
    searchString: t.Optional(t.String()),
    sortKeys: t.Optional(t.Array(t.String())),
  },
  { $id: 'SubjectPlatform', title: 'SubjectPlatform' },
);

export type ISubjectRating = Static<typeof SubjectRating>;
export const SubjectRating = t.Object(
  {
    count: t.Array(t.Integer()),
    score: t.Number(),
    total: t.Integer(),
  },
  { $id: 'SubjectRating', title: 'SubjectRating' },
);

export type ISubjectImages = Static<typeof SubjectImages>;
export const SubjectImages = t.Object(
  {
    large: t.String(),
    common: t.String(),
    medium: t.String(),
    small: t.String(),
    grid: t.String(),
  },
  { $id: 'SubjectImages', title: 'SubjectImages' },
);

export type IPersonImages = Static<typeof PersonImages>;
export const PersonImages = t.Object(
  {
    large: t.String(),
    medium: t.String(),
    small: t.String(),
    grid: t.String(),
  },
  { $id: 'PersonImages', title: 'PersonImages' },
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

export const Error = t.Object(
  {
    code: t.String(),
    error: t.String(),
    message: t.String(),
    statusCode: t.Integer(),
  },
  { $id: 'ErrorResponse', description: 'default error response type' },
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

export function toInfobox(content: string): IInfobox {
  let wiki: WikiMap = {
    type: '',
    data: new Map(),
  };
  try {
    wiki = parseWiki(content);
  } catch (error) {
    if (!(error instanceof WikiSyntaxError)) {
      throw error;
    }
  }
  const infobox: IInfobox = {};
  for (const [key, item] of wiki.data) {
    switch (typeof item) {
      case 'string': {
        infobox[key] = [
          {
            v: item,
          },
        ];
        break;
      }
      case 'object': {
        infobox[key] = item.map((v) => {
          return {
            k: v.k,
            v: v.v || '',
          };
        });
        break;
      }
    }
  }
  return infobox;
}

export function toResUser(user: orm.IUser): IUser {
  return {
    avatar: avatar(user.img),
    username: user.username,
    nickname: user.nickname,
    id: user.id,
    sign: user.sign,
    user_group: user.groupID,
  };
}

export function errorResponses(...errors: FastifyError[]): Record<number, unknown> {
  const status: Record<number, FastifyError[]> = lo.groupBy(errors, (x) => x.statusCode ?? 500);

  return lo.mapValues(status, (errs) => {
    return t.Ref(Error, {
      'x-examples': formatErrors(...errs),
    });
  });
}

export type UnknownObject = Record<string, unknown>;
