import type { Static } from '@sinclair/typebox';
import { Type as t } from '@sinclair/typebox';

import { db, op } from '@app/drizzle/db.ts';
import type * as orm from '@app/drizzle/orm.ts';
import * as schema from '@app/drizzle/schema';
import { NotFoundError } from '@app/lib/error.ts';
import { Security, Tag } from '@app/lib/openapi/index.ts';
import { fetchUserByUsername } from '@app/lib/orm/index.ts';
import {
  CollectionType,
  CollectionTypeProfileValues,
  EpisodeCollectionStatus,
  EpisodeType,
  PersonType,
  SubjectType,
  SubjectTypeValues,
  type UserEpisodeCollection,
} from '@app/lib/subject/type.ts';
import { getTimelineUser } from '@app/lib/timeline/user';
import * as convert from '@app/lib/types/convert.ts';
import * as examples from '@app/lib/types/examples.ts';
import * as fetcher from '@app/lib/types/fetcher.ts';
import * as res from '@app/lib/types/res.ts';
import { formatErrors } from '@app/lib/types/res.ts';
import { requireLogin } from '@app/routes/hooks/pre-handler.ts';
import type { App } from '@app/routes/type.ts';

export type IUserSubjectCollection = Static<typeof UserSubjectCollection>;
const UserSubjectCollection = t.Object(
  {
    subject: t.Ref(res.Subject),
    rate: t.Integer(),
    type: t.Enum(CollectionType),
    comment: t.String(),
    tags: t.Array(t.String()),
    epStatus: t.Integer(),
    volStatus: t.Integer(),
    private: t.Boolean(),
    updatedAt: t.Integer(),
  },
  { $id: 'UserSubjectCollection' },
);

export type IUserSubjectEpisodeCollection = Static<typeof UserSubjectEpisodeCollection>;
const UserSubjectEpisodeCollection = t.Object(
  {
    episode: t.Ref(res.Episode),
    type: t.Enum(EpisodeCollectionStatus),
  },
  { $id: 'UserSubjectEpisodeCollection' },
);

export type IUserCharacterCollection = Static<typeof UserCharacterCollection>;
const UserCharacterCollection = t.Object(
  {
    character: t.Ref(res.Character),
    createdAt: t.Integer(),
  },
  { $id: 'UserCharacterCollection' },
);

export type IUserPersonCollection = Static<typeof UserPersonCollection>;
const UserPersonCollection = t.Object(
  {
    person: t.Ref(res.Person),
    createdAt: t.Integer(),
  },
  { $id: 'UserPersonCollection' },
);

export type IUserIndexCollection = Static<typeof UserIndexCollection>;
const UserIndexCollection = t.Object(
  {
    index: t.Ref(res.Index),
    createdAt: t.Integer(),
  },
  { $id: 'UserIndexCollection' },
);

export type IUserCollectionsSubjectSummary = Static<typeof UserCollectionsSubjectSummary>;
const UserCollectionsSubjectSummary = t.Object(
  {
    counts: t.Record(t.String({ description: 'collection type id' }), t.Integer(), {
      examples: [{ '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }],
    }),
    details: t.Record(
      t.String({ description: 'collection type id' }),
      t.Array(t.Ref(res.SlimSubject)),
      {
        examples: [{ '1': [], '2': [examples.slimSubject], '3': [], '4': [], '5': [] }],
      },
    ),
  },
  { $id: 'UserCollectionsSubjectSummary' },
);

export type IUserCollectionsCharacterSummary = Static<typeof UserCollectionsCharacterSummary>;
const UserCollectionsCharacterSummary = t.Object(
  {
    count: t.Integer(),
    detail: t.Array(t.Ref(res.SlimCharacter)),
  },
  { $id: 'UserCollectionsCharacterSummary' },
);

export type IUserCollectionsPersonSummary = Static<typeof UserCollectionsPersonSummary>;
const UserCollectionsPersonSummary = t.Object(
  {
    count: t.Integer(),
    detail: t.Array(t.Ref(res.SlimPerson)),
  },
  { $id: 'UserCollectionsPersonSummary' },
);

export type IUserIndexesSummary = Static<typeof UserIndexesSummary>;
const UserIndexesSummary = t.Object(
  {
    count: t.Integer(),
    detail: t.Array(t.Ref(res.SlimIndex)),
  },
  { $id: 'UserIndexesSummary' },
);

export type IUserCollectionsSummary = Static<typeof UserCollectionsSummary>;
const UserCollectionsSummary = t.Object(
  {
    subject: t.Record(
      t.String({ description: 'subject type id' }),
      t.Ref(UserCollectionsSubjectSummary),
      {
        examples: [
          {
            '1': {
              counts: { '1': 0, '2': 1, '3': 0, '4': 0, '5': 0 },
              details: { '1': [], '2': [examples.slimSubject], '3': [], '4': [], '5': [] },
            },
          },
        ],
      },
    ),
    character: t.Ref(UserCollectionsCharacterSummary),
    person: t.Ref(UserCollectionsPersonSummary),
    index: t.Ref(UserIndexesSummary),
  },
  { $id: 'UserCollectionsSummary' },
);

function toUserSubjectCollection(
  interest: orm.ISubjectInterest,
  subject: orm.ISubject,
  fields: orm.ISubjectFields,
): IUserSubjectCollection {
  return {
    subject: convert.toSubject(subject, fields),
    rate: interest.rate,
    type: interest.type,
    comment: interest.comment,
    tags: interest.tag
      .split(' ')
      .map((x) => x.trim())
      .filter((x) => x !== ''),
    epStatus: interest.epStatus,
    volStatus: interest.volStatus,
    private: Boolean(interest.private),
    updatedAt: interest.updatedAt,
  };
}

function toUserSubjectEpisodeCollection(
  episode: orm.IEpisode,
  epStatus: UserEpisodeCollection | undefined,
): IUserSubjectEpisodeCollection {
  return {
    episode: convert.toEpisode(episode),
    type: epStatus?.type ?? EpisodeCollectionStatus.None,
  };
}

function toUserCharacterCollection(
  collect: orm.IPersonCollect,
  character: orm.ICharacter,
): IUserCharacterCollection {
  return {
    character: convert.toCharacter(character),
    createdAt: collect.createdAt,
  };
}

function toUserPersonCollection(
  collect: orm.IPersonCollect,
  person: orm.IPerson,
): IUserPersonCollection {
  return {
    person: convert.toPerson(person),
    createdAt: collect.createdAt,
  };
}

function toUserIndexCollection(
  collect: orm.IIndexCollect,
  index: orm.IIndex,
  user: orm.IUser,
): IUserIndexCollection {
  return {
    index: convert.toIndex(index, user),
    createdAt: collect.createdAt,
  };
}

// eslint-disable-next-line @typescript-eslint/require-await
export async function setup(app: App) {
  app.addSchema(UserSubjectCollection);
  app.addSchema(UserSubjectEpisodeCollection);
  app.addSchema(UserCharacterCollection);
  app.addSchema(UserPersonCollection);
  app.addSchema(UserIndexCollection);
  app.addSchema(UserCollectionsSubjectSummary);
  app.addSchema(UserCollectionsCharacterSummary);
  app.addSchema(UserCollectionsPersonSummary);
  app.addSchema(UserIndexesSummary);
  app.addSchema(UserCollectionsSummary);

  app.get(
    '/users/:username',
    {
      schema: {
        summary: '获取用户信息',
        operationId: 'getUser',
        tags: [Tag.User],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          username: t.String(),
        }),
        response: {
          200: t.Ref(res.User),
        },
      },
    },
    async ({ params: { username } }) => {
      const [data] = await db
        .select()
        .from(schema.chiiUsers)
        .innerJoin(schema.chiiUserFields, op.eq(schema.chiiUsers.id, schema.chiiUserFields.uid))
        .where(op.eq(schema.chiiUsers.username, username))
        .execute();
      if (!data) {
        throw new NotFoundError(`user ${username}`);
      }
      const user = convert.toUser(data.chii_members, data.chii_memberfields);
      const svcs = await db
        .select()
        .from(schema.chiiUserNetworkServices)
        .where(op.eq(schema.chiiUserNetworkServices.uid, user.id))
        .execute();
      for (const svc of svcs) {
        user.networkServices.push(convert.toUserNetworkService(svc));
      }
      return user;
    },
  );

  app.get(
    '/users/:username/friends',
    {
      schema: {
        summary: '获取用户的好友列表',
        operationId: 'getUserFriends',
        tags: [Tag.User],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          username: t.String(),
        }),
        querystring: t.Object({
          limit: t.Optional(
            t.Integer({ default: 20, minimum: 1, maximum: 100, description: 'max 100' }),
          ),
          offset: t.Optional(t.Integer({ default: 0, minimum: 0, description: 'min 0' })),
        }),
        response: {
          200: res.Paged(t.Ref(res.Friend)),
        },
      },
    },
    async ({ params: { username }, query: { limit = 20, offset = 0 } }) => {
      const user = await fetchUserByUsername(username);
      if (!user) {
        throw new NotFoundError('user');
      }

      const conditions = op.and(op.eq(schema.chiiFriends.uid, user.id));

      const [{ count = 0 } = {}] = await db
        .select({
          count: op.count(),
        })
        .from(schema.chiiFriends)
        .where(conditions)
        .execute();

      const data = await db
        .select()
        .from(schema.chiiFriends)
        .innerJoin(schema.chiiUsers, op.eq(schema.chiiFriends.fid, schema.chiiUsers.id))
        .where(conditions)
        .orderBy(op.desc(schema.chiiFriends.createdAt))
        .limit(limit)
        .offset(offset)
        .execute();
      const friends = data.map((d) => convert.toFriend(d.chii_members, d.chii_friends));

      return {
        data: friends,
        total: count,
      };
    },
  );

  app.get(
    '/users/:username/collections/summary',
    {
      schema: {
        summary: '获取用户收藏概览',
        operationId: 'getUserCollectionsSummary',
        tags: [Tag.User],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          username: t.String({ minLength: 1 }),
        }),
        response: {
          200: t.Ref(UserCollectionsSummary),
        },
      },
    },
    async ({ auth, params: { username } }): Promise<Static<typeof UserCollectionsSummary>> => {
      const user = await fetchUserByUsername(username);
      if (!user) {
        throw new NotFoundError('user');
      }
      const defaultCounts: Record<string, number> = {
        [CollectionType.Wish]: 0,
        [CollectionType.Collect]: 0,
        [CollectionType.Doing]: 0,
        [CollectionType.OnHold]: 0,
        [CollectionType.Dropped]: 0,
      };
      const defaultDetails: Record<string, res.ISlimSubject[]> = {
        [CollectionType.Wish]: [],
        [CollectionType.Collect]: [],
      };
      const subjectSummary: Record<string, IUserCollectionsSubjectSummary> = {
        [SubjectType.Book]: {
          counts: structuredClone(defaultCounts),
          details: structuredClone(defaultDetails),
        },
        [SubjectType.Anime]: {
          counts: structuredClone(defaultCounts),
          details: structuredClone(defaultDetails),
        },
        [SubjectType.Music]: {
          counts: structuredClone(defaultCounts),
          details: structuredClone(defaultDetails),
        },
        [SubjectType.Game]: {
          counts: structuredClone(defaultCounts),
          details: structuredClone(defaultDetails),
        },
        [SubjectType.Real]: {
          counts: structuredClone(defaultCounts),
          details: structuredClone(defaultDetails),
        },
      };
      const characterSummary: IUserCollectionsCharacterSummary = {
        count: 0,
        detail: [],
      };
      const personSummary: IUserCollectionsPersonSummary = {
        count: 0,
        detail: [],
      };
      const indexSummary: IUserIndexesSummary = {
        count: 0,
        detail: [],
      };

      async function fillSubjectCounts(userID: number) {
        const data = await db
          .select({
            count: op.count(),
            interest_subject_type: schema.chiiSubjectInterests.subjectType,
            interest_type: schema.chiiSubjectInterests.type,
          })
          .from(schema.chiiSubjectInterests)
          .where(
            op.and(
              op.eq(schema.chiiSubjectInterests.uid, userID),
              op.ne(schema.chiiSubjectInterests.type, 0),
            ),
          )
          .groupBy(schema.chiiSubjectInterests.subjectType, schema.chiiSubjectInterests.type)
          .execute();
        for (const d of data) {
          const summary = subjectSummary[d.interest_subject_type];
          if (!summary) {
            continue;
          }
          summary.counts[d.interest_type] = d.count;
        }
      }
      async function fillCharacterCount(userID: number) {
        const [{ count = 0 } = {}] = await db
          .select({
            count: op.count(),
          })
          .from(schema.chiiPersonCollects)
          .where(
            op.and(
              op.eq(schema.chiiPersonCollects.uid, userID),
              op.eq(schema.chiiPersonCollects.cat, PersonType.Character),
            ),
          )
          .execute();
        characterSummary.count = count;
      }
      async function fillPersonCount(userID: number) {
        const [{ count = 0 } = {}] = await db
          .select({
            count: op.count(),
          })
          .from(schema.chiiPersonCollects)
          .where(
            op.and(
              op.eq(schema.chiiPersonCollects.uid, userID),
              op.eq(schema.chiiPersonCollects.cat, PersonType.Person),
            ),
          )
          .execute();
        personSummary.count = count;
      }
      async function fillIndexCount(userID: number) {
        const [{ count = 0 } = {}] = await db
          .select({
            count: op.count(),
          })
          .from(schema.chiiIndexes)
          .where(op.and(op.eq(schema.chiiIndexes.uid, userID), op.ne(schema.chiiIndexes.ban, 1)))
          .execute();
        indexSummary.count = count;
      }

      const countJobs = [
        fillSubjectCounts(user.id),
        fillCharacterCount(user.id),
        fillPersonCount(user.id),
        fillIndexCount(user.id),
      ];
      await Promise.all(countJobs);

      async function appendSubjectDetails(stype: number, ctype: number, userID: number) {
        const data = await db
          .select()
          .from(schema.chiiSubjectInterests)
          .innerJoin(
            schema.chiiSubjects,
            op.eq(schema.chiiSubjectInterests.subjectID, schema.chiiSubjects.id),
          )
          .innerJoin(
            schema.chiiSubjectFields,
            op.eq(schema.chiiSubjects.id, schema.chiiSubjectFields.id),
          )
          .where(
            op.and(
              op.eq(schema.chiiSubjectInterests.uid, userID),
              op.eq(schema.chiiSubjectInterests.subjectType, stype),
              op.eq(schema.chiiSubjectInterests.type, ctype),
              op.ne(schema.chiiSubjects.ban, 1),
              op.eq(schema.chiiSubjectFields.fieldRedirect, 0),
              auth.userID === userID ? undefined : op.eq(schema.chiiSubjectInterests.private, 0),
              auth.allowNsfw ? undefined : op.eq(schema.chiiSubjects.nsfw, false),
            ),
          )
          .orderBy(op.desc(schema.chiiSubjectInterests.updatedAt))
          .limit(7)
          .execute();
        for (const d of data) {
          const summary = subjectSummary[stype];
          if (!summary) {
            continue;
          }
          const details = summary.details[ctype];
          if (!details) {
            continue;
          }
          const slim = convert.toSlimSubject(d.chii_subjects);
          details.push(slim);
        }
      }
      async function appendCharacterDetail(userID: number) {
        const data = await db
          .select()
          .from(schema.chiiPersonCollects)
          .innerJoin(
            schema.chiiCharacters,
            op.eq(schema.chiiPersonCollects.mid, schema.chiiCharacters.id),
          )
          .where(
            op.and(
              op.eq(schema.chiiPersonCollects.uid, userID),
              op.eq(schema.chiiPersonCollects.cat, PersonType.Character),
              op.ne(schema.chiiCharacters.ban, 1),
              auth.allowNsfw ? undefined : op.eq(schema.chiiCharacters.nsfw, false),
            ),
          )
          .orderBy(op.desc(schema.chiiPersonCollects.createdAt))
          .limit(7)
          .execute();
        for (const d of data) {
          const summary = characterSummary.detail;
          if (!summary) {
            continue;
          }
          const slim = convert.toSlimCharacter(d.chii_characters);
          summary.push(slim);
        }
      }
      async function appendPersonDetail(userID: number) {
        const data = await db
          .select()
          .from(schema.chiiPersonCollects)
          .innerJoin(
            schema.chiiPersons,
            op.eq(schema.chiiPersonCollects.mid, schema.chiiPersons.id),
          )
          .where(
            op.and(
              op.eq(schema.chiiPersonCollects.uid, userID),
              op.eq(schema.chiiPersonCollects.cat, PersonType.Person),
              op.ne(schema.chiiPersons.ban, 1),
              auth.allowNsfw ? undefined : op.eq(schema.chiiPersons.nsfw, false),
            ),
          )
          .orderBy(op.desc(schema.chiiPersonCollects.createdAt))
          .limit(7)
          .execute();
        for (const d of data) {
          const summary = personSummary.detail;
          if (!summary) {
            continue;
          }
          const slim = convert.toSlimPerson(d.chii_persons);
          summary.push(slim);
        }
      }
      async function appendIndexDetail(userID: number) {
        const data = await db
          .select()
          .from(schema.chiiIndexes)
          .where(op.and(op.eq(schema.chiiIndexes.uid, userID), op.ne(schema.chiiIndexes.ban, 1)))
          .orderBy(op.desc(schema.chiiIndexes.createdAt))
          .limit(7)
          .execute();
        for (const d of data) {
          const summary = indexSummary.detail;
          if (!summary) {
            continue;
          }
          const slim = convert.toSlimIndex(d);
          summary.push(slim);
        }
      }

      const detailJobs = [
        appendCharacterDetail(user.id),
        appendPersonDetail(user.id),
        appendIndexDetail(user.id),
      ];
      for (const stype of SubjectTypeValues) {
        for (const ctype of CollectionTypeProfileValues) {
          detailJobs.push(appendSubjectDetails(stype, ctype, user.id));
        }
      }
      await Promise.all(detailJobs);

      return {
        subject: subjectSummary,
        character: characterSummary,
        person: personSummary,
        index: indexSummary,
      };
    },
  );

  app.get(
    '/users/:username/collections/subjects',
    {
      schema: {
        summary: '获取用户条目收藏',
        operationId: 'getUserSubjectCollections',
        tags: [Tag.User],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          username: t.String({ minLength: 1 }),
        }),
        querystring: t.Object({
          subjectType: t.Optional(t.Enum(SubjectType, { description: '条目类型' })),
          type: t.Optional(t.Enum(CollectionType, { description: '收藏类型' })),
          since: t.Optional(t.Integer({ minimum: 0, description: '起始时间戳' })),
          limit: t.Optional(
            t.Integer({ default: 20, minimum: 1, maximum: 100, description: 'max 100' }),
          ),
          offset: t.Optional(t.Integer({ default: 0, minimum: 0, description: 'min 0' })),
        }),
        response: {
          200: res.Paged(t.Ref(UserSubjectCollection)),
        },
      },
    },
    async ({
      auth,
      params: { username },
      query: { subjectType, type, since, limit = 20, offset = 0 },
    }) => {
      const user = await fetchUserByUsername(username);
      if (!user) {
        throw new NotFoundError('user');
      }

      const conditions = op.and(
        op.eq(schema.chiiSubjectInterests.uid, user.id),
        subjectType ? op.eq(schema.chiiSubjectInterests.subjectType, subjectType) : undefined,
        type
          ? op.eq(schema.chiiSubjectInterests.type, type)
          : op.ne(schema.chiiSubjectInterests.type, 0),
        since ? op.gte(schema.chiiSubjectInterests.updatedAt, since) : undefined,
        op.ne(schema.chiiSubjects.ban, 1),
        op.eq(schema.chiiSubjectFields.fieldRedirect, 0),
        auth.userID === user.id ? undefined : op.eq(schema.chiiSubjectInterests.private, 0),
        auth.allowNsfw ? undefined : op.eq(schema.chiiSubjects.nsfw, false),
      );

      const [{ count = 0 } = {}] = await db
        .select({ count: op.count() })
        .from(schema.chiiSubjectInterests)
        .innerJoin(
          schema.chiiSubjects,
          op.eq(schema.chiiSubjectInterests.subjectID, schema.chiiSubjects.id),
        )
        .innerJoin(
          schema.chiiSubjectFields,
          op.eq(schema.chiiSubjects.id, schema.chiiSubjectFields.id),
        )
        .where(conditions)
        .execute();

      const data = await db
        .select()
        .from(schema.chiiSubjectInterests)
        .innerJoin(
          schema.chiiSubjects,
          op.eq(schema.chiiSubjectInterests.subjectID, schema.chiiSubjects.id),
        )
        .innerJoin(
          schema.chiiSubjectFields,
          op.eq(schema.chiiSubjects.id, schema.chiiSubjectFields.id),
        )
        .where(conditions)
        .orderBy(op.desc(schema.chiiSubjectInterests.updatedAt))
        .limit(limit)
        .offset(offset)
        .execute();

      const collections = data.map((d) =>
        toUserSubjectCollection(d.chii_subject_interests, d.chii_subjects, d.chii_subject_fields),
      );

      return {
        data: collections,
        total: count,
      };
    },
  );

  app.get(
    '/users/:username/collections/subjects/:subjectID',
    {
      schema: {
        summary: '获取用户单个条目收藏',
        operationId: 'getUserSubjectCollectionBySubjectID',
        tags: [Tag.User],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          username: t.String({ minLength: 1 }),
          subjectID: t.Integer({ minimum: 1 }),
        }),
        response: {
          200: t.Ref(UserSubjectCollection),
        },
      },
    },
    async ({ auth, params: { username, subjectID } }) => {
      const user = await fetchUserByUsername(username);
      if (!user) {
        throw new NotFoundError('user');
      }

      const conditions = op.and(
        op.eq(schema.chiiSubjectInterests.uid, user.id),
        op.eq(schema.chiiSubjectInterests.subjectID, subjectID),
        op.ne(schema.chiiSubjectInterests.type, 0),
        op.ne(schema.chiiSubjects.ban, 1),
        op.eq(schema.chiiSubjectFields.fieldRedirect, 0),
        auth.userID === user.id ? undefined : op.eq(schema.chiiSubjectInterests.private, 0),
        auth.allowNsfw ? undefined : op.eq(schema.chiiSubjects.nsfw, false),
      );

      const data = await db
        .select()
        .from(schema.chiiSubjectInterests)
        .innerJoin(
          schema.chiiSubjects,
          op.eq(schema.chiiSubjectInterests.subjectID, schema.chiiSubjects.id),
        )
        .innerJoin(
          schema.chiiSubjectFields,
          op.eq(schema.chiiSubjects.id, schema.chiiSubjectFields.id),
        )
        .where(conditions)
        .execute();

      for (const d of data) {
        return toUserSubjectCollection(
          d.chii_subject_interests,
          d.chii_subjects,
          d.chii_subject_fields,
        );
      }

      throw new NotFoundError('collection');
    },
  );

  app.get(
    '/users/-/collections/subjects/:subjectID/episodes',
    {
      schema: {
        summary: '获取用户单个条目的章节收藏',
        operationId: 'getUserSubjectCollectionEpisodesBySubjectID',
        tags: [Tag.User],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          subjectID: t.Integer({ minimum: 1 }),
        }),
        querystring: t.Object({
          type: t.Optional(t.Enum(EpisodeType, { description: '剧集类型' })),
          limit: t.Optional(
            t.Integer({ default: 100, minimum: 1, maximum: 1000, description: 'max 1000' }),
          ),
          offset: t.Optional(t.Integer({ default: 0, minimum: 0, description: 'min 0' })),
        }),
        response: {
          200: res.Paged(t.Ref(UserSubjectEpisodeCollection)),
        },
      },
      preHandler: [requireLogin('get subject episode collections')],
    },
    async ({ auth, params: { subjectID }, query: { type, limit = 100, offset = 0 } }) => {
      const subject = await fetcher.fetchSlimSubjectByID(subjectID, auth.allowNsfw);
      if (!subject) {
        throw new NotFoundError(`subject ${subjectID}`);
      }
      const epStatus = await fetcher.fetchSubjectEpStatus(auth.userID, subjectID);
      const conditions = op.and(
        op.eq(schema.chiiEpisodes.subjectID, subjectID),
        op.ne(schema.chiiEpisodes.ban, 1),
        type ? op.eq(schema.chiiEpisodes.type, type) : undefined,
      );
      const [{ count = 0 } = {}] = await db
        .select({ count: op.count() })
        .from(schema.chiiEpisodes)
        .where(conditions)
        .execute();

      const data = await db
        .select()
        .from(schema.chiiEpisodes)
        .where(conditions)
        .orderBy(
          op.asc(schema.chiiEpisodes.disc),
          op.asc(schema.chiiEpisodes.type),
          op.asc(schema.chiiEpisodes.sort),
        )
        .limit(limit)
        .offset(offset)
        .execute();
      const collections = data.map((d) => toUserSubjectEpisodeCollection(d, epStatus[d.id]));

      return {
        data: collections,
        total: count,
      };
    },
  );

  app.get(
    '/users/-/collections/subjects/-/episodes/:episodeID',
    {
      schema: {
        summary: '获取用户单个条目的单个章节收藏',
        operationId: 'getUserSubjectCollectionEpisodeByEpisodeID',
        tags: [Tag.User],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          episodeID: t.Integer({ minimum: 1 }),
        }),
        response: {
          200: t.Ref(UserSubjectEpisodeCollection),
        },
      },
      preHandler: [requireLogin('get subject episode collection')],
    },
    async ({ auth, params: { episodeID } }) => {
      const [episode] = await db
        .select()
        .from(schema.chiiEpisodes)
        .where(op.and(op.eq(schema.chiiEpisodes.id, episodeID), op.ne(schema.chiiEpisodes.ban, 1)))
        .execute();
      if (!episode) {
        throw new NotFoundError(`episode ${episodeID}`);
      }
      const epStatus = await fetcher.fetchSubjectEpStatus(auth.userID, episode.subjectID);
      if (!epStatus) {
        throw new NotFoundError(`status of episode ${episodeID}`);
      }
      return toUserSubjectEpisodeCollection(episode, epStatus[episodeID]);
    },
  );

  app.get(
    '/users/:username/collections/characters',
    {
      schema: {
        summary: '获取用户角色收藏',
        operationId: 'getUserCharacterCollections',
        tags: [Tag.User],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          username: t.String({ minLength: 1 }),
        }),
        querystring: t.Object({
          limit: t.Optional(
            t.Integer({ default: 20, minimum: 1, maximum: 100, description: 'max 100' }),
          ),
          offset: t.Optional(t.Integer({ default: 0, minimum: 0, description: 'min 0' })),
        }),
        responses: {
          200: res.Paged(t.Ref(UserCharacterCollection)),
        },
      },
    },
    async ({ auth, params: { username }, query: { limit = 20, offset = 0 } }) => {
      const user = await fetchUserByUsername(username);
      if (!user) {
        throw new NotFoundError('user');
      }

      const conditions = op.and(
        op.eq(schema.chiiPersonCollects.cat, PersonType.Character),
        op.eq(schema.chiiPersonCollects.uid, user.id),
        op.ne(schema.chiiCharacters.ban, 1),
        op.eq(schema.chiiCharacters.redirect, 0),
        auth.allowNsfw ? undefined : op.eq(schema.chiiCharacters.nsfw, false),
      );

      const [{ count = 0 } = {}] = await db
        .select({ count: op.count() })
        .from(schema.chiiPersonCollects)
        .innerJoin(
          schema.chiiCharacters,
          op.eq(schema.chiiPersonCollects.mid, schema.chiiCharacters.id),
        )
        .where(conditions)
        .execute();

      const data = await db
        .select()
        .from(schema.chiiPersonCollects)
        .innerJoin(
          schema.chiiCharacters,
          op.eq(schema.chiiPersonCollects.mid, schema.chiiCharacters.id),
        )
        .where(conditions)
        .orderBy(op.desc(schema.chiiPersonCollects.createdAt))
        .limit(limit)
        .offset(offset)
        .execute();
      const collection = data.map((d) =>
        toUserCharacterCollection(d.chii_person_collects, d.chii_characters),
      );

      return {
        data: collection,
        total: count,
      };
    },
  );

  app.get(
    '/users/:username/collections/characters/:characterID',
    {
      schema: {
        summary: '获取用户单个角色收藏',
        operationId: 'getUserCharacterCollectionByCharacterID',
        tags: [Tag.User],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          username: t.String({ minLength: 1 }),
          characterID: t.Integer({ minimum: 1 }),
        }),
        response: {
          200: t.Ref(UserCharacterCollection),
        },
      },
    },
    async ({ auth, params: { username, characterID } }) => {
      const user = await fetchUserByUsername(username);
      if (!user) {
        throw new NotFoundError('user');
      }

      const conditions = op.and(
        op.eq(schema.chiiPersonCollects.uid, user.id),
        op.eq(schema.chiiPersonCollects.mid, characterID),
        op.ne(schema.chiiCharacters.ban, 1),
        op.eq(schema.chiiCharacters.redirect, 0),
        auth.allowNsfw ? undefined : op.eq(schema.chiiCharacters.nsfw, false),
      );

      const data = await db
        .select()
        .from(schema.chiiPersonCollects)
        .innerJoin(
          schema.chiiCharacters,
          op.eq(schema.chiiPersonCollects.mid, schema.chiiCharacters.id),
        )
        .where(conditions)
        .execute();

      for (const d of data) {
        return toUserCharacterCollection(d.chii_person_collects, d.chii_characters);
      }

      throw new NotFoundError('collection');
    },
  );

  app.get(
    '/users/:username/collections/persons',
    {
      schema: {
        summary: '获取用户人物收藏',
        operationId: 'getUserPersonCollections',
        tags: [Tag.User],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          username: t.String({ minLength: 1 }),
        }),
        querystring: t.Object({
          limit: t.Optional(
            t.Integer({ default: 20, minimum: 1, maximum: 100, description: 'max 100' }),
          ),
          offset: t.Optional(t.Integer({ default: 0, minimum: 0, description: 'min 0' })),
        }),
        responses: {
          200: res.Paged(t.Ref(UserPersonCollection)),
        },
      },
    },
    async ({ auth, params: { username }, query: { limit = 20, offset = 0 } }) => {
      const user = await fetchUserByUsername(username);
      if (!user) {
        throw new NotFoundError('user');
      }

      const conditions = op.and(
        op.eq(schema.chiiPersonCollects.cat, PersonType.Person),
        op.eq(schema.chiiPersonCollects.uid, user.id),
        op.ne(schema.chiiPersons.ban, 1),
        op.eq(schema.chiiPersons.redirect, 0),
        auth.allowNsfw ? undefined : op.eq(schema.chiiPersons.nsfw, false),
      );

      const [{ count = 0 } = {}] = await db
        .select({ count: op.count() })
        .from(schema.chiiPersonCollects)
        .innerJoin(schema.chiiPersons, op.eq(schema.chiiPersonCollects.mid, schema.chiiPersons.id))
        .where(conditions)
        .execute();

      const data = await db
        .select()
        .from(schema.chiiPersonCollects)
        .innerJoin(schema.chiiPersons, op.eq(schema.chiiPersonCollects.mid, schema.chiiPersons.id))
        .where(conditions)
        .orderBy(op.desc(schema.chiiPersonCollects.createdAt))
        .limit(limit)
        .offset(offset)
        .execute();
      const collection = data.map((d) =>
        toUserPersonCollection(d.chii_person_collects, d.chii_persons),
      );

      return {
        data: collection,
        total: count,
      };
    },
  );

  app.get(
    '/users/:username/collections/persons/:personID',
    {
      schema: {
        summary: '获取用户单个人物收藏',
        operationId: 'getUserPersonCollectionByPersonID',
        tags: [Tag.User],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          username: t.String({ minLength: 1 }),
          personID: t.Integer({ minimum: 1 }),
        }),
        response: {
          200: t.Ref(UserPersonCollection),
        },
      },
    },
    async ({ auth, params: { username, personID } }) => {
      const user = await fetchUserByUsername(username);
      if (!user) {
        throw new NotFoundError('user');
      }

      const conditions = op.and(
        op.eq(schema.chiiPersonCollects.cat, PersonType.Person),
        op.eq(schema.chiiPersonCollects.uid, user.id),
        op.eq(schema.chiiPersonCollects.mid, personID),
        op.ne(schema.chiiPersons.ban, 1),
        op.eq(schema.chiiPersons.redirect, 0),
        auth.allowNsfw ? undefined : op.eq(schema.chiiPersons.nsfw, false),
      );

      const data = await db
        .select()
        .from(schema.chiiPersonCollects)
        .innerJoin(schema.chiiPersons, op.eq(schema.chiiPersonCollects.mid, schema.chiiPersons.id))
        .where(conditions)
        .execute();

      for (const d of data) {
        return toUserPersonCollection(d.chii_person_collects, d.chii_persons);
      }

      throw new NotFoundError('collection');
    },
  );

  app.get(
    '/users/:username/collections/indexes',
    {
      schema: {
        summary: '获取用户目录收藏',
        operationId: 'getUserIndexCollections',
        tags: [Tag.User],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          username: t.String({ minLength: 1 }),
        }),
        querystring: t.Object({
          limit: t.Optional(
            t.Integer({ default: 20, minimum: 1, maximum: 100, description: 'max 100' }),
          ),
          offset: t.Optional(t.Integer({ default: 0, minimum: 0, description: 'min 0' })),
        }),
        responses: {
          200: res.Paged(t.Ref(UserIndexCollection)),
        },
      },
    },
    async ({ params: { username }, query: { limit = 20, offset = 0 } }) => {
      const user = await fetchUserByUsername(username);
      if (!user) {
        throw new NotFoundError('user');
      }

      const conditions = op.and(
        op.eq(schema.chiiIndexCollects.uid, user.id),
        op.ne(schema.chiiIndexes.ban, 1),
      );

      const [{ count = 0 } = {}] = await db
        .select({ count: op.count() })
        .from(schema.chiiIndexCollects)
        .innerJoin(schema.chiiIndexes, op.eq(schema.chiiIndexCollects.mid, schema.chiiIndexes.id))
        .where(conditions)
        .execute();

      const data = await db
        .select()
        .from(schema.chiiIndexCollects)
        .innerJoin(schema.chiiIndexes, op.eq(schema.chiiIndexCollects.mid, schema.chiiIndexes.id))
        .innerJoin(schema.chiiUsers, op.eq(schema.chiiIndexes.uid, schema.chiiUsers.id))
        .where(conditions)
        .orderBy(op.desc(schema.chiiIndexCollects.createdAt))
        .limit(limit)
        .offset(offset)
        .execute();
      const collection = data.map((d) =>
        toUserIndexCollection(d.chii_index_collects, d.chii_index, d.chii_members),
      );

      return {
        data: collection,
        total: count,
      };
    },
  );

  app.get(
    '/users/:username/collections/indexes/:indexID',
    {
      schema: {
        summary: '获取用户单个目录收藏',
        operationId: 'getUserIndexCollectionByIndexID',
        tags: [Tag.User],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          username: t.String({ minLength: 1 }),
          indexID: t.Integer({ minimum: 1 }),
        }),
        response: {
          200: t.Ref(UserIndexCollection),
        },
      },
    },
    async ({ params: { username, indexID } }) => {
      const user = await fetchUserByUsername(username);
      if (!user) {
        throw new NotFoundError('user');
      }

      const conditions = op.and(
        op.eq(schema.chiiIndexCollects.uid, user.id),
        op.eq(schema.chiiIndexCollects.mid, indexID),
        op.ne(schema.chiiIndexes.ban, 1),
      );

      const data = await db
        .select()
        .from(schema.chiiIndexCollects)
        .innerJoin(schema.chiiIndexes, op.eq(schema.chiiIndexCollects.mid, schema.chiiIndexes.id))
        .innerJoin(schema.chiiUsers, op.eq(schema.chiiIndexes.uid, schema.chiiUsers.id))
        .where(conditions)
        .execute();

      for (const d of data) {
        return toUserIndexCollection(d.chii_index_collects, d.chii_index, d.chii_members);
      }

      throw new NotFoundError('collection');
    },
  );

  app.get(
    '/users/:username/indexes',
    {
      schema: {
        summary: '获取用户创建的目录',
        operationId: 'getUserIndexes',
        tags: [Tag.User],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          username: t.String({ minLength: 1 }),
        }),
        querystring: t.Object({
          limit: t.Optional(
            t.Integer({ default: 20, minimum: 1, maximum: 100, description: 'max 100' }),
          ),
          offset: t.Optional(t.Integer({ default: 0, minimum: 0, description: 'min 0' })),
        }),
        responses: {
          200: res.Paged(t.Ref(res.Index)),
          404: t.Ref(res.Error, {
            'x-examples': formatErrors(new NotFoundError('user')),
          }),
        },
      },
    },
    async ({ params: { username }, query: { limit = 20, offset = 0 } }) => {
      const user = await fetchUserByUsername(username);
      if (!user) {
        throw new NotFoundError('user');
      }

      const conditions = op.and(
        op.eq(schema.chiiIndexes.uid, user.id),
        op.ne(schema.chiiIndexes.ban, 1),
      );

      const [{ count = 0 } = {}] = await db
        .select({ count: op.count() })
        .from(schema.chiiIndexes)
        .where(conditions)
        .execute();

      const data = await db
        .select()
        .from(schema.chiiIndexes)
        .where(conditions)
        .orderBy(op.desc(schema.chiiIndexes.createdAt))
        .limit(limit)
        .offset(offset)
        .execute();
      const indexes = data.map((d) => convert.toSlimIndex(d));

      return {
        data: indexes,
        total: count,
      };
    },
  );

  app.get(
    '/users/:username/timeline',
    {
      schema: {
        summary: '获取用户时间胶囊',
        operationId: 'getUserTimeline',
        tags: [Tag.User],
        params: t.Object({
          username: t.String({ minLength: 1 }),
        }),
        querystring: t.Object({
          offset: t.Optional(t.Integer({ default: 0, minimum: 0, description: 'min 0' })),
        }),
        responses: {
          200: t.Array(t.Ref(res.Timeline)),
        },
      },
    },
    async ({ params: { username }, query: { offset = 0 } }) => {
      const user = await fetchUserByUsername(username);
      if (!user) {
        throw new NotFoundError('user');
      }

      const ids = await getTimelineUser(user.id, 20, offset);
      const result = await fetcher.fetchTimelineByIDs(ids);
      const items = [];
      for (const tid of ids) {
        const item = result[tid];
        if (item) {
          items.push(item);
        }
      }
      return items;
    },
  );
}
