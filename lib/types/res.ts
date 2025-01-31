import type { FastifyError } from '@fastify/error';
import type { Static, TSchema } from '@sinclair/typebox';
import { Type as t } from '@sinclair/typebox';
import httpCodes from 'http-status-codes';
import * as lo from 'lodash-es';

import {
  CollectionType,
  EpisodeCollectionStatus,
  EpisodeType,
  Ref,
  SubjectType,
} from '@app/lib/types/common.ts';
import * as examples from '@app/lib/types/examples.ts';

export * from '@app/lib/types/common.ts';

export interface IPaged<T> {
  data: T[];
  total: number;
}

export const Paged = <T extends TSchema>(type: T) =>
  t.Object({
    data: t.Array(type),
    total: t.Integer({
      description: 'limit+offset 为参数的请求表示总条数，page 为参数的请求表示总页数',
    }),
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
    return Ref(Error, {
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

export type IUserNetworkService = Static<typeof UserNetworkService>;
export const UserNetworkService = t.Object(
  {
    name: t.String(),
    title: t.String(),
    url: t.String(),
    color: t.String(),
    account: t.String(),
  },
  { $id: 'UserNetworkService', title: 'UserNetworkService' },
);

export type IUserHomepageSection = Static<typeof UserHomepageSection>;
export const UserHomepageSection = t.String({
  $id: 'UserHomepageSection',
  enum: ['anime', 'game', 'book', 'music', 'real', 'mono', 'blog', 'friend', 'group', 'index'],
  'x-ms-enum': {
    name: 'UserHomepageSection',
    modelAsString: true,
  },
  'x-enum-varnames': [
    'Anime',
    'Game',
    'Book',
    'Music',
    'Real',
    'Mono',
    'Blog',
    'Friend',
    'Group',
    'Index',
  ],
  description: '用户时光机板块',
});

export type IUserHomepage = Static<typeof UserHomepage>;
export const UserHomepage = t.Object(
  {
    left: t.Array(Ref(UserHomepageSection)),
    right: t.Array(Ref(UserHomepageSection)),
  },
  { $id: 'UserHomepage', title: 'UserHomepage' },
);

export type IUserSubjectCollectionStats = Static<typeof UserSubjectCollectionStats>;
export const UserSubjectCollectionStats = t.Record(
  t.Integer({ description: '条目类型(SubjectType)' }),
  t.Record(t.Integer({ description: '收藏类型(CollectionType)' }), t.Integer()),
  { $id: 'UserSubjectCollectionStats', title: 'UserSubjectCollectionStats' },
);

export type IUserMonoCollectionStats = Static<typeof UserMonoCollectionStats>;
export const UserMonoCollectionStats = t.Object(
  {
    character: t.Integer(),
    person: t.Integer(),
  },
  { $id: 'UserMonoCollectionStats', title: 'UserMonoCollectionStats' },
);

export type IUserIndexStats = Static<typeof UserIndexStats>;
export const UserIndexStats = t.Object(
  {
    create: t.Integer(),
    collect: t.Integer(),
  },
  { $id: 'UserIndexStats', title: 'UserIndexStats' },
);

export type IUserStats = Static<typeof UserStats>;
export const UserStats = t.Object(
  {
    subject: Ref(UserSubjectCollectionStats),
    mono: Ref(UserMonoCollectionStats),
    blog: t.Integer(),
    friend: t.Integer(),
    group: t.Integer(),
    index: Ref(UserIndexStats),
  },
  { $id: 'UserStats', title: 'UserStats' },
);

export type ISlimUser = Static<typeof SlimUser>;
export const SlimUser = t.Object(
  {
    id: t.Integer({ examples: [1] }),
    username: t.String({ examples: ['sai'] }),
    nickname: t.String({ examples: ['Sai🖖'] }),
    avatar: Ref(Avatar),
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
    avatar: Ref(Avatar),
    group: t.Integer(),
    user_group: t.Integer({ description: 'deprecated, use group instead' }),
    joinedAt: t.Integer(),
    sign: t.String(),
    site: t.String(),
    location: t.String(),
    bio: t.String(),
    networkServices: t.Array(UserNetworkService),
    homepage: Ref(UserHomepage),
    stats: Ref(UserStats),
  },
  { $id: 'User', title: 'User' },
);

export type IFriend = Static<typeof Friend>;
export const Friend = t.Object(
  {
    user: Ref(SlimUser),
    grade: t.Integer(),
    createdAt: t.Integer(),
    description: t.String(),
  },
  { $id: 'Friend', title: 'Friend' },
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

export type ISubjectInterest = Static<typeof SubjectInterest>;
export const SubjectInterest = t.Object(
  {
    rate: t.Integer(),
    type: Ref(CollectionType),
    comment: t.String(),
    tags: t.Array(t.String()),
    epStatus: t.Integer(),
    volStatus: t.Integer(),
    private: t.Boolean(),
    updatedAt: t.Integer(),
  },
  { $id: 'SubjectInterest', title: 'SubjectInterest' },
);

export type ISlimSubjectInterest = Static<typeof SlimSubjectInterest>;
export const SlimSubjectInterest = t.Object(
  {
    rate: t.Integer(),
    type: Ref(CollectionType),
    comment: t.String(),
    tags: t.Array(t.String()),
    updatedAt: t.Integer(),
  },
  { $id: 'SlimSubjectInterest', title: 'SlimSubjectInterest' },
);

export type ISubject = Static<typeof Subject>;
export const Subject = t.Object(
  {
    airtime: Ref(SubjectAirtime),
    collection: Ref(SubjectCollection),
    eps: t.Integer(),
    id: t.Integer(),
    images: t.Optional(Ref(SubjectImages)),
    infobox: Ref(Infobox),
    info: t.String(),
    metaTags: t.Array(t.String()),
    locked: t.Boolean(),
    name: t.String(),
    nameCN: t.String(),
    nsfw: t.Boolean(),
    platform: Ref(SubjectPlatform),
    rating: Ref(SubjectRating),
    redirect: t.Integer(),
    series: t.Boolean(),
    seriesEntry: t.Integer(),
    summary: t.String(),
    type: Ref(SubjectType),
    volumes: t.Integer(),
    tags: t.Array(Ref(SubjectTag)),
    interest: t.Optional(Ref(SubjectInterest)),
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
    type: Ref(SubjectType),
    images: t.Optional(Ref(SubjectImages)),
    info: t.String(),
    rating: Ref(SubjectRating),
    locked: t.Boolean(),
    nsfw: t.Boolean(),
    interest: t.Optional(Ref(SlimSubjectInterest)),
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

export type IEpisode = Static<typeof Episode>;
export const Episode = t.Object(
  {
    id: t.Integer(),
    sort: t.Number(),
    type: Ref(EpisodeType),
    disc: t.Integer(),
    name: t.String(),
    nameCN: t.String(),
    duration: t.String(),
    airdate: t.String(),
    comment: t.Integer(),
    desc: t.Optional(t.String()),
    status: t.Optional(Ref(EpisodeCollectionStatus)),
    subjectID: t.Integer(),
    subject: t.Optional(Ref(SlimSubject)),
  },
  { $id: 'Episode', title: 'Episode' },
);

export type IEpisodeCommentBase = Static<typeof EpisodeCommentBase>;
export const EpisodeCommentBase = t.Object(
  {
    id: t.Integer(),
    epID: t.Integer(),
    creatorID: t.Integer(),
    relatedID: t.Integer(),
    createdAt: t.Integer(),
    content: t.String(),
    state: t.Integer(),
    user: Ref(SlimUser),
    reactions: t.Array(Ref(Reaction)),
  },
  {
    $id: 'EpisodeCommentBase',
  },
);

export type IEpisodeComment = Static<typeof EpisodeComment>;
export const EpisodeComment = t.Intersect(
  [
    EpisodeCommentBase,
    t.Object({
      replies: t.Array(Ref(EpisodeCommentBase)),
    }),
  ],
  { $id: 'EpisodeComments' },
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
    infobox: Ref(Infobox),
    summary: t.String(),
    images: t.Optional(Ref(PersonImages)),
    comment: t.Integer(),
    collects: t.Integer(),
    lock: t.Boolean(),
    redirect: t.Integer(),
    nsfw: t.Boolean(),
    collectedAt: t.Optional(t.Integer()),
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
    images: t.Optional(Ref(PersonImages)),
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
    infobox: Ref(Infobox),
    career: t.Array(t.String(), {
      description: '职业',
      examples: ['producer', 'mangaka', 'artist', 'seiyu', 'writer', 'illustrator', 'actor'],
    }),
    summary: t.String(),
    images: t.Optional(Ref(PersonImages)),
    comment: t.Integer(),
    collects: t.Integer(),
    lock: t.Boolean(),
    redirect: t.Integer(),
    nsfw: t.Boolean(),
    collectedAt: t.Optional(t.Integer()),
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
    images: t.Optional(Ref(PersonImages)),
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

export type IBlogEntry = Static<typeof BlogEntry>;
export const BlogEntry = t.Object(
  {
    id: t.Integer(),
    type: t.Integer(),
    user: Ref(SlimUser),
    title: t.String(),
    icon: t.String(),
    content: t.String(),
    tags: t.Array(t.String()),
    views: t.Integer(),
    replies: t.Integer(),
    createdAt: t.Integer(),
    updatedAt: t.Integer(),
    noreply: t.Integer(),
    related: t.Integer(),
    public: t.Boolean(),
  },
  { $id: 'BlogEntry', title: 'BlogEntry' },
);

export type ISlimBlogEntry = Static<typeof SlimBlogEntry>;
export const SlimBlogEntry = t.Object(
  {
    id: t.Integer(),
    uid: t.Integer(),
    type: t.Integer(),
    title: t.String(),
    icon: t.String(),
    summary: t.String(),
    replies: t.Integer(),
    public: t.Boolean(),
    createdAt: t.Integer(),
    updatedAt: t.Integer(),
  },
  { $id: 'SlimBlogEntry', title: 'SlimBlogEntry' },
);

export type IBlogPhoto = Static<typeof BlogPhoto>;
export const BlogPhoto = t.Object(
  {
    id: t.Integer(),
    target: t.String(),
    icon: t.String(),
    vote: t.Integer(),
    createdAt: t.Integer(),
  },
  { $id: 'BlogPhoto', title: 'BlogPhoto' },
);

export type ISubjectComment = Static<typeof SubjectComment>;
export const SubjectComment = t.Object(
  {
    user: Ref(SlimUser),
    type: Ref(CollectionType),
    rate: t.Integer(),
    comment: t.String(),
    updatedAt: t.Integer(),
  },
  { $id: 'SubjectComment', title: 'SubjectComment' },
);

export type ISubjectReview = Static<typeof SubjectReview>;
export const SubjectReview = t.Object(
  {
    id: t.Integer(),
    user: Ref(SlimUser),
    entry: Ref(SlimBlogEntry),
  },
  { $id: 'SubjectReview', title: 'SubjectReview' },
);

export type ISubjectRelation = Static<typeof SubjectRelation>;
export const SubjectRelation = t.Object(
  {
    subject: Ref(SlimSubject),
    relation: Ref(SubjectRelationType),
    order: t.Integer(),
  },
  { $id: 'SubjectRelation' },
);

export type ISubjectCharacter = Static<typeof SubjectCharacter>;
export const SubjectCharacter = t.Object(
  {
    character: Ref(SlimCharacter),
    actors: t.Array(Ref(SlimPerson)),
    type: t.Integer(),
    order: t.Integer(),
  },
  { $id: 'SubjectCharacter' },
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
    type: Ref(SubjectStaffPositionType),
    summary: t.String(),
    appearEps: t.String(),
  },
  { $id: 'SubjectStaffPosition' },
);

export type ISubjectPositionStaff = Static<typeof SubjectPositionStaff>;
export const SubjectPositionStaff = t.Object(
  {
    person: Ref(SlimPerson),
    summary: t.String(),
    appearEps: t.String(),
  },
  { $id: 'SubjectPositionStaff' },
);

export type ISubjectStaff = Static<typeof SubjectStaff>;
export const SubjectStaff = t.Object(
  {
    staff: Ref(SlimPerson),
    positions: t.Array(Ref(SubjectStaffPosition)),
  },
  { $id: 'SubjectStaff' },
);

export type ISubjectPosition = Static<typeof SubjectPosition>;
export const SubjectPosition = t.Object(
  {
    position: Ref(SubjectStaffPositionType),
    staffs: t.Array(Ref(SubjectPositionStaff)),
  },
  { $id: 'SubjectPosition' },
);

export type ISubjectRec = Static<typeof SubjectRec>;
export const SubjectRec = t.Object(
  {
    subject: Ref(SlimSubject),
    sim: t.Number(),
    count: t.Integer(),
  },
  { $id: 'SubjectRec', title: 'SubjectRec' },
);

export type ICharacterRelation = Static<typeof CharacterRelation>;
export const CharacterRelation = t.Object(
  {
    character: Ref(SlimCharacter),
    relation: t.Integer({ description: '角色关系: 任职于,从属,聘用,嫁给...' }),
  },
  { $id: 'CharacterRelation' },
);

export type ICharacterSubject = Static<typeof CharacterSubject>;
export const CharacterSubject = t.Object(
  {
    subject: Ref(SlimSubject),
    actors: t.Array(Ref(SlimPerson)),
    type: t.Integer(),
  },
  { $id: 'CharacterSubject' },
);

export type ICharacterSubjectRelation = Static<typeof CharacterSubjectRelation>;
export const CharacterSubjectRelation = t.Object(
  {
    subject: Ref(SlimSubject),
    type: t.Integer(),
  },
  { $id: 'CharacterSubjectRelation' },
);

export type IPersonRelation = Static<typeof PersonRelation>;
export const PersonRelation = t.Object(
  {
    person: Ref(SlimPerson),
    relation: t.Integer({ description: '人物关系: 任职于,从属,聘用,嫁给...' }),
  },
  { $id: 'PersonRelation' },
);

export type IPersonWork = Static<typeof PersonWork>;
export const PersonWork = t.Object(
  {
    subject: Ref(SlimSubject),
    positions: t.Array(Ref(SubjectStaffPosition)),
  },
  { $id: 'PersonWork' },
);

export type IPersonCharacter = Static<typeof PersonCharacter>;
export const PersonCharacter = t.Object(
  {
    character: Ref(SlimCharacter),
    relations: t.Array(Ref(CharacterSubjectRelation)),
  },
  { $id: 'PersonCharacter' },
);

export type IPersonCollect = Static<typeof PersonCollect>;
export const PersonCollect = t.Object(
  {
    user: Ref(SlimUser),
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
    stats: Ref(IndexStats),
    createdAt: t.Integer(),
    updatedAt: t.Integer(),
    collectedAt: t.Optional(t.Integer()),
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
    cat: t.Integer(),
    name: t.String(),
    nsfw: t.Boolean(),
    title: t.String(),
    icon: Ref(Avatar),
    creatorID: t.Integer(),
    creator: t.Optional(Ref(SlimUser)),
    topics: t.Integer(),
    posts: t.Integer(),
    members: t.Integer(),
    description: t.String(),
    accessible: t.Boolean(),
    createdAt: t.Integer(),
  },
  { $id: 'Group', title: 'Group' },
);

export type ISlimGroup = Static<typeof SlimGroup>;
export const SlimGroup = t.Object(
  {
    id: t.Integer(),
    name: t.String(),
    nsfw: t.Boolean(),
    title: t.String(),
    icon: Ref(Avatar),
    creatorID: t.Integer(),
    members: t.Integer(),
    accessible: t.Boolean(),
    createdAt: t.Integer(),
  },
  { $id: 'SlimGroup', title: 'SlimGroup' },
);

export type IGroupMember = Static<typeof GroupMember>;
export const GroupMember = t.Object(
  {
    uid: t.Integer(),
    user: t.Optional(Ref(SlimUser)),
    moderator: t.Boolean(),
    joinedAt: t.Integer(),
  },
  { $id: 'GroupMember', title: 'GroupMember' },
);

export type ISubReply = Static<typeof SubReply>;
export const SubReply = t.Object(
  {
    id: t.Integer(),
    creatorID: t.Integer(),
    creator: t.Optional(Ref(SlimUser)),
    createdAt: t.Integer(),
    text: t.String(),
    state: t.Integer(),
    reactions: t.Array(Ref(Reaction)),
  },
  { $id: 'SubReply', title: 'SubReply' },
);

export type IReply = Static<typeof Reply>;
export const Reply = t.Object(
  {
    id: t.Integer(),
    replies: t.Array(Ref(SubReply)),
    creatorID: t.Integer(),
    creator: t.Optional(Ref(SlimUser)),
    createdAt: t.Integer(),
    text: t.String(),
    state: t.Integer(),
    reactions: t.Array(Ref(Reaction)),
  },
  { $id: 'Reply', title: 'Reply' },
);

export type ITopic = Static<typeof Topic>;
export const Topic = t.Object(
  {
    id: t.Integer(),
    creatorID: t.Integer(),
    creator: t.Optional(Ref(SlimUser)),
    title: t.String(),
    parentID: t.Integer({ description: '小组/条目ID' }),
    createdAt: t.Integer({ description: '发帖时间，unix time stamp in seconds' }),
    updatedAt: t.Integer({ description: '最后回复时间，unix time stamp in seconds' }),
    replies: t.Integer(),
    state: t.Integer(),
    display: t.Integer(),
  },
  { $id: 'Topic', title: 'Topic' },
);

export type ITopicDetail = Static<typeof TopicDetail>;
export const TopicDetail = t.Object(
  {
    id: t.Integer(),
    parent: t.Union([Ref(SlimGroup), Ref(SlimSubject)]),
    creator: Ref(SlimUser),
    title: t.String(),
    content: t.String(),
    state: t.Integer(),
    createdAt: t.Integer(),
    replies: t.Array(Ref(Reply)),
    reactions: t.Array(Ref(Reaction)),
    display: t.Integer(),
  },
  { $id: 'TopicDetail', title: 'TopicDetail' },
);

export type ITimelineMemo = Static<typeof TimelineMemo>;
export const TimelineMemo = t.Object(
  {
    daily: t.Optional(
      t.Object({
        users: t.Optional(t.Array(Ref(SlimUser))),
        groups: t.Optional(t.Array(Ref(SlimGroup))),
      }),
    ),
    wiki: t.Optional(
      t.Object({
        subject: t.Optional(Ref(SlimSubject)),
      }),
    ),
    subject: t.Optional(
      t.Array(
        t.Object({
          subject: Ref(SlimSubject),
          comment: t.String(),
          rate: t.Number(),
        }),
      ),
    ),
    progress: t.Optional(
      t.Object({
        batch: t.Optional(
          t.Object({
            epsTotal: t.String(),
            epsUpdate: t.Optional(t.Integer()),
            volsTotal: t.String(),
            volsUpdate: t.Optional(t.Integer()),
            subject: Ref(SlimSubject),
          }),
        ),
        single: t.Optional(
          t.Object({
            episode: Ref(Episode),
            subject: Ref(SlimSubject),
          }),
        ),
      }),
    ),
    status: t.Optional(
      t.Object({
        sign: t.Optional(t.String()),
        tsukkomi: t.Optional(t.String()),
        nickname: t.Optional(t.Object({ before: t.String(), after: t.String() })),
      }),
    ),
    blog: t.Optional(Ref(SlimBlogEntry)),
    index: t.Optional(Ref(SlimIndex)),
    mono: t.Optional(
      t.Object({
        characters: t.Array(Ref(SlimCharacter)),
        persons: t.Array(Ref(SlimPerson)),
      }),
    ),
  },
  { $id: 'TimelineMemo', title: 'TimelineMemo' },
);

export const TimelineCat = t.Integer({
  $id: 'TimelineCat',
  enum: [1, 2, 3, 4, 5, 6, 7, 8, 9],
  'x-ms-enum': {
    name: 'TimelineCat',
    modelAsString: false,
  },
  'x-enum-varnames': [
    'Daily',
    'Wiki',
    'Subject',
    'Progress',
    'Status',
    'Blog',
    'Index',
    'Mono',
    'Doujin',
  ],
  description: `时间线类型
  - 1 = 日常行为
  - 2 = 维基操作
  - 3 = 收藏条目
  - 4 = 收视进度
  - 5 = 状态
  - 6 = 日志
  - 7 = 目录
  - 8 = 人物
  - 9 = 天窗`,
});

export const TimelineSource = t.Integer({
  $id: 'TimelineSource',
  enum: [0, 1, 2, 3, 4, 5],
  'x-ms-enum': {
    name: 'TimelineSource',
    modelAsString: false,
  },
  'x-enum-varnames': ['Web', 'Mobile', 'OnAir', 'InTouch', 'WP', 'API'],
  description: `时间线来源
  - 0 = 网站
  - 1 = 移动端
  - 2 = https://bgm.tv/onair
  - 3 = https://netaba.re/
  - 4 = WP
  - 5 = API`,
});

export type ITimeline = Static<typeof Timeline>;
export const Timeline = t.Object(
  {
    id: t.Integer(),
    uid: t.Integer(),
    user: t.Optional(Ref(SlimUser)),
    cat: Ref(TimelineCat),
    type: t.Integer(),
    memo: Ref(TimelineMemo),
    batch: t.Boolean(),
    source: Ref(TimelineSource),
    replies: t.Integer(),
    createdAt: t.Integer(),
  },
  { $id: 'Timeline', title: 'Timeline' },
);
