import type { FastifyError } from '@fastify/error';
import type { Static, TSchema } from '@sinclair/typebox';
import { Type as t } from '@sinclair/typebox';
import httpCodes from 'http-status-codes';
import * as lo from 'lodash-es';

import { SubjectType } from '@app/lib/subject/type.ts';
import * as examples from '@app/lib/types/examples.ts';

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

export type ISubject = Static<typeof Subject>;
export const Subject = t.Object(
  {
    airtime: t.Ref(SubjectAirtime),
    collection: t.Ref(SubjectCollection),
    eps: t.Integer(),
    id: t.Integer(),
    images: t.Optional(t.Ref(SubjectImages)),
    infobox: t.Ref(Infobox),
    metaTags: t.Array(t.String()),
    locked: t.Boolean(),
    name: t.String(),
    nameCN: t.String(),
    nsfw: t.Boolean(),
    platform: t.Ref(SubjectPlatform),
    rating: t.Ref(SubjectRating),
    redirect: t.Integer(),
    series: t.Boolean(),
    seriesEntry: t.Integer(),
    summary: t.String(),
    type: t.Enum(SubjectType),
    volumes: t.Integer(),
  },
  {
    $id: 'Subject',
    title: 'Subject',
    examples: [examples.subject],
  },
);

export type ISlimSubject = Static<typeof SlimSubject>;
export const SlimSubject = t.Object(
  {
    id: t.Integer(),
    name: t.String(),
    nameCN: t.String(),
    type: t.Enum(SubjectType),
    images: t.Optional(t.Ref(SubjectImages)),
    locked: t.Boolean(),
    nsfw: t.Boolean(),
  },
  { $id: 'SlimSubject', title: 'SlimSubject', examples: [examples.slimSubject] },
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

export type ICharacter = Static<typeof Character>;
export const Character = t.Object(
  {
    id: t.Integer(),
    name: t.String(),
    role: t.Integer(),
    infobox: t.Ref(Infobox),
    summary: t.String(),
    images: t.Optional(t.Ref(PersonImages)),
    comment: t.Integer(),
    collects: t.Integer(),
    lock: t.Boolean(),
    redirect: t.Integer(),
    nsfw: t.Boolean(),
  },
  {
    $id: 'Character',
    title: 'Character',
    // examples: [examples.character],
  },
);

export type ISlimCharacter = Static<typeof SlimCharacter>;
export const SlimCharacter = t.Object(
  {
    id: t.Integer(),
    name: t.String(),
    role: t.Integer(),
    images: t.Optional(t.Ref(PersonImages)),
    lock: t.Boolean(),
    nsfw: t.Boolean(),
  },
  {
    $id: 'SlimCharacter',
    title: 'SlimCharacter',
    // examples: [examples.slimCharacter],
  },
);

export type IPerson = Static<typeof Person>;
export const Person = t.Object(
  {
    id: t.Integer(),
    name: t.String(),
    type: t.Integer(),
    infobox: t.Ref(Infobox),
    career: t.Array(t.String(), {
      description: '职业',
      examples: ['producer', 'mangaka', 'artist', 'seiyu', 'writer', 'illustrator', 'actor'],
    }),
    summary: t.String(),
    images: t.Optional(t.Ref(PersonImages)),
    comment: t.Integer(),
    collects: t.Integer(),
    lock: t.Boolean(),
    redirect: t.Integer(),
    nsfw: t.Boolean(),
  },
  {
    $id: 'Person',
    title: 'Person',
    // examples: [examples.person],
  },
);

export type ISlimPerson = Static<typeof SlimPerson>;
export const SlimPerson = t.Object(
  {
    id: t.Integer(),
    name: t.String(),
    type: t.Integer(),
    images: t.Optional(t.Ref(PersonImages)),
    lock: t.Boolean(),
    nsfw: t.Boolean(),
  },
  {
    $id: 'SlimPerson',
    title: 'SlimPerson',
    // examples: [examples.slimPerson],
  },
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

export type IFriend = Static<typeof Friend>;
export const Friend = t.Object(
  {
    user: t.Ref(User),
    grade: t.Integer(),
    createdAt: t.Integer(),
    description: t.String(),
  },
  { $id: 'Friend', title: 'Friend' },
);

export type IIndex = Static<typeof Index>;
export const Index = t.Object(
  {
    id: t.Integer(),
    type: t.Integer(),
    title: t.String(),
    desc: t.String(),
    replies: t.Integer(),
    total: t.Integer(),
    collects: t.Integer(),
    // TODO: parse stats
    // stats: t.String(),
    createdAt: t.Integer(),
    updatedAt: t.Integer(),
    creator: t.Ref(User),
  },
  { $id: 'Index', title: 'Index' },
);

export type ISlimIndex = Static<typeof SlimIndex>;
export const SlimIndex = t.Object(
  {
    id: t.Integer(),
    type: t.Integer(),
    title: t.String(),
    total: t.Integer(),
    createdAt: t.Integer(),
  },
  { $id: 'SlimIndex', title: 'SlimIndex' },
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

export function errorResponses(...errors: FastifyError[]): Record<number, unknown> {
  const status: Record<number, FastifyError[]> = lo.groupBy(errors, (x) => x.statusCode ?? 500);

  return lo.mapValues(status, (errs) => {
    return t.Ref(Error, {
      'x-examples': formatErrors(...errs),
    });
  });
}

export type UnknownObject = Record<string, unknown>;

export type EmptyObject = Record<string, number>;
