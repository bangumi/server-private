import type { FastifyError } from '@fastify/error';
import type { Static, TSchema } from '@sinclair/typebox';
import { Type as t } from '@sinclair/typebox';
import httpCodes from 'http-status-codes';
import * as lo from 'lodash-es';

import { EpisodeType, SubjectType } from '@app/lib/subject/type.ts';
import * as examples from '@app/lib/types/examples.ts';

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

export type IAvatar = Static<typeof Avatar>;
export const Avatar = t.Object(
  {
    small: t.String(),
    medium: t.String({ examples: ['sai'] }),
    large: t.String(),
  },
  { $id: 'Avatar', title: 'Avatar' },
);

export type IUserHomepage = Static<typeof UserHomepage>;
export const UserHomepage = t.Object(
  {
    left: t.Array(t.String()),
    right: t.Array(t.String()),
  },
  { $id: 'UserHomepage', title: 'UserHomepage' },
);

export type ISlimUser = Static<typeof SlimUser>;
export const SlimUser = t.Object(
  {
    id: t.Integer({ examples: [1] }),
    username: t.String({ examples: ['sai'] }),
    nickname: t.String({ examples: ['Sai🖖'] }),
    avatar: t.Ref(Avatar),
    sign: t.String(),
    joinedAt: t.Integer(),
  },
  { $id: 'SlimUser', title: 'SlimUser' },
);

export type IUser = Static<typeof User>;
export const User = t.Object(
  {
    id: t.Integer({ examples: [1] }),
    username: t.String({ examples: ['sai'] }),
    nickname: t.String({ examples: ['Sai🖖'] }),
    avatar: t.Ref(Avatar),
    group: t.Integer(),
    user_group: t.Integer({ description: 'deprecated, use group instead' }),
    joinedAt: t.Integer(),
    sign: t.String(),
    site: t.String(),
    location: t.String(),
    bio: t.String(),
    // wait for permission
    // homepage: t.Ref(UserHomepage),
  },
  { $id: 'User', title: 'User' },
);

export type IFriend = Static<typeof Friend>;
export const Friend = t.Object(
  {
    user: t.Ref(SlimUser),
    grade: t.Integer(),
    createdAt: t.Integer(),
    description: t.String(),
  },
  { $id: 'Friend', title: 'Friend' },
);

export type IInfoboxValue = Static<typeof InfoboxValue>;
export const InfoboxValue = t.Object(
  {
    k: t.Optional(t.String()),
    v: t.String(),
  },
  { $id: 'InfoboxValue', title: 'InfoboxValue' },
);

export type IInfoboxItem = Static<typeof InfoboxItem>;
export const InfoboxItem = t.Object(
  {
    key: t.String(),
    values: t.Array(InfoboxValue),
  },
  { $id: 'InfoboxItem', title: 'InfoboxItem' },
);

export type IInfobox = Static<typeof Infobox>;
export const Infobox = t.Array(InfoboxItem, { $id: 'Infobox', title: 'Infobox' });

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

export type ISubjectTag = Static<typeof SubjectTag>;
export const SubjectTag = t.Object(
  {
    name: t.String(),
    count: t.Integer(),
  },
  { $id: 'SubjectTag', title: 'SubjectTag' },
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
    rank: t.Integer(),
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
    tags: t.Array(t.Ref(SubjectTag)),
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

export type ISubjectRelationType = Static<typeof SubjectRelationType>;
export const SubjectRelationType = t.Object(
  {
    id: t.Integer(),
    en: t.String(),
    cn: t.String(),
    jp: t.String(),
    desc: t.String(),
  },
  { $id: 'SubjectRelationType' },
);

export type ISubjectStaffPositionType = Static<typeof SubjectStaffPositionType>;
export const SubjectStaffPositionType = t.Object(
  {
    id: t.Integer(),
    en: t.String(),
    cn: t.String(),
    jp: t.String(),
  },
  { $id: 'SubjectStaffPositionType' },
);

export type ISubjectStaffPosition = Static<typeof SubjectStaffPosition>;
export const SubjectStaffPosition = t.Object(
  {
    type: t.Ref(SubjectStaffPositionType),
    summary: t.String(),
  },
  { $id: 'SubjectStaffPosition' },
);

export type IEpisode = Static<typeof Episode>;
export const Episode = t.Object(
  {
    id: t.Integer(),
    subjectID: t.Integer(),
    sort: t.Number(),
    type: t.Enum(EpisodeType),
    disc: t.Integer(),
    name: t.String(),
    nameCN: t.String(),
    duration: t.String(),
    airdate: t.String(),
    comment: t.Integer(),
    desc: t.String(),
    lock: t.Boolean(),
  },
  { $id: 'Episode', title: 'Episode' },
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
    nameCN: t.String(),
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
    nameCN: t.String(),
    role: t.Integer(),
    images: t.Optional(t.Ref(PersonImages)),
    comment: t.Integer(),
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
    nameCN: t.String(),
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
    nameCN: t.String(),
    type: t.Integer(),
    images: t.Optional(t.Ref(PersonImages)),
    comment: t.Integer(),
    lock: t.Boolean(),
    nsfw: t.Boolean(),
  },
  {
    $id: 'SlimPerson',
    title: 'SlimPerson',
    // examples: [examples.slimPerson],
  },
);

export type ISubjectComment = Static<typeof SubjectComment>;
export const SubjectComment = t.Object(
  {
    user: t.Ref(SlimUser),
    rate: t.Integer(),
    comment: t.String(),
    updatedAt: t.Integer(),
  },
  { $id: 'SubjectComment', title: 'SubjectComment' },
);

export type ISubjectRelation = Static<typeof SubjectRelation>;
export const SubjectRelation = t.Object(
  {
    subject: t.Ref(SlimSubject),
    relation: t.Ref(SubjectRelationType),
    order: t.Integer(),
  },
  { $id: 'SubjectRelation' },
);

export type ISubjectCharacter = Static<typeof SubjectCharacter>;
export const SubjectCharacter = t.Object(
  {
    character: t.Ref(SlimCharacter),
    actors: t.Array(t.Ref(SlimPerson)),
    type: t.Integer(),
    order: t.Integer(),
  },
  { $id: 'SubjectCharacter' },
);

export type ISubjectStaff = Static<typeof SubjectStaff>;
export const SubjectStaff = t.Object(
  {
    person: t.Ref(SlimPerson),
    positions: t.Array(t.Ref(SubjectStaffPosition)),
  },
  { $id: 'SubjectStaff' },
);

export type ISubjectRec = Static<typeof SubjectRec>;
export const SubjectRec = t.Object(
  {
    subject: t.Ref(SlimSubject),
    sim: t.Number(),
    count: t.Integer(),
  },
  { $id: 'SubjectRec', title: 'SubjectRec' },
);

export type ICharacterRelation = Static<typeof CharacterRelation>;
export const CharacterRelation = t.Object(
  {
    character: t.Ref(SlimCharacter),
    relation: t.Integer({ description: '角色关系: 任职于,从属,聘用,嫁给...' }),
  },
  { $id: 'CharacterRelation' },
);

export type ICharacterSubject = Static<typeof CharacterSubject>;
export const CharacterSubject = t.Object(
  {
    subject: t.Ref(SlimSubject),
    actors: t.Array(t.Ref(SlimPerson)),
    type: t.Integer(),
  },
  { $id: 'CharacterSubject' },
);

export type ICharacterSubjectRelation = Static<typeof CharacterSubjectRelation>;
export const CharacterSubjectRelation = t.Object(
  {
    subject: t.Ref(SlimSubject),
    type: t.Integer(),
  },
  { $id: 'CharacterSubjectRelation' },
);

export type IPersonRelation = Static<typeof PersonRelation>;
export const PersonRelation = t.Object(
  {
    person: t.Ref(SlimPerson),
    relation: t.Integer({ description: '人物关系: 任职于,从属,聘用,嫁给...' }),
  },
  { $id: 'PersonRelation' },
);

export type IPersonWork = Static<typeof PersonWork>;
export const PersonWork = t.Object(
  {
    subject: t.Ref(SlimSubject),
    positions: t.Array(t.Ref(SubjectStaffPosition)),
  },
  { $id: 'PersonWork' },
);

export type IPersonCharacter = Static<typeof PersonCharacter>;
export const PersonCharacter = t.Object(
  {
    character: t.Ref(SlimCharacter),
    relations: t.Array(t.Ref(CharacterSubjectRelation)),
  },
  { $id: 'PersonCharacter' },
);

export type IPersonCollect = Static<typeof PersonCollect>;
export const PersonCollect = t.Object(
  {
    user: t.Ref(SlimUser),
    createdAt: t.Integer(),
  },
  { $id: 'PersonCollect' },
);

export type IIndexStats = Static<typeof IndexStats>;
export const IndexStats = t.Record(t.Integer(), t.Integer(), {
  $id: 'IndexStats',
  title: 'IndexStats',
});

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
    stats: t.Ref(IndexStats),
    createdAt: t.Integer(),
    updatedAt: t.Integer(),
    creator: t.Ref(SlimUser),
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

export type IGroup = Static<typeof Group>;
export const Group = t.Object(
  {
    id: t.Integer(),
    name: t.String(),
    nsfw: t.Boolean(),
    title: t.String(),
    icon: t.String(),
    description: t.String(),
    totalMembers: t.Integer(),
    createdAt: t.Integer(),
  },
  { $id: 'Group', title: 'Group' },
);

export type IGroupMember = Static<typeof GroupMember>;
export const GroupMember = t.Object(
  {
    id: t.Integer(),
    nickname: t.String(),
    username: t.String(),
    avatar: t.Ref(Avatar),
    joinedAt: t.Integer(),
  },
  { $id: 'GroupMember', title: 'GroupMember' },
);

export type IReaction = Static<typeof Reaction>;
export const Reaction = t.Object(
  {
    selected: t.Boolean(),
    total: t.Integer(),
    value: t.Integer(),
  },
  { $id: 'Reaction', title: 'Reaction' },
);

export type ISubReply = Static<typeof SubReply>;
export const SubReply = t.Object(
  {
    id: t.Integer(),
    creator: t.Ref(SlimUser),
    createdAt: t.Integer(),
    isFriend: t.Boolean(),
    text: t.String(),
    state: t.Integer(),
    reactions: t.Array(t.Ref(Reaction)),
  },
  { $id: 'SubReply', title: 'SubReply' },
);

export type IReply = Static<typeof Reply>;
export const Reply = t.Object(
  {
    id: t.Integer(),
    isFriend: t.Boolean(),
    replies: t.Array(t.Ref(SubReply)),
    creator: t.Ref(SlimUser),
    createdAt: t.Integer(),
    text: t.String(),
    state: t.Integer(),
    reactions: t.Array(t.Ref(Reaction)),
  },
  { $id: 'Reply', title: 'Reply' },
);

export type ITopic = Static<typeof Topic>;
export const Topic = t.Object(
  {
    id: t.Integer(),
    creator: t.Ref(SlimUser),
    title: t.String(),
    parentID: t.Integer({ description: '小组/条目ID' }),
    createdAt: t.Integer({ description: '发帖时间，unix time stamp in seconds' }),
    updatedAt: t.Integer({ description: '最后回复时间，unix time stamp in seconds' }),
    repliesCount: t.Integer(),
    state: t.Integer(),
    display: t.Integer(),
  },
  { $id: 'Topic', title: 'Topic' },
);

export type ITopicDetail = Static<typeof TopicDetail>;
export const TopicDetail = t.Object(
  {
    id: t.Integer(),
    parent: t.Union([t.Ref(Group), t.Ref(SlimSubject)]),
    creator: t.Ref(SlimUser),
    title: t.String(),
    text: t.String(),
    state: t.Integer(),
    createdAt: t.Integer(),
    replies: t.Array(t.Ref(Reply)),
    reactions: t.Array(t.Ref(Reaction)),
  },
  { $id: 'TopicDetail', title: 'TopicDetail' },
);
