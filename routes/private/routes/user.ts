import type { Static } from '@sinclair/typebox';
import { Type as t } from '@sinclair/typebox';

import { db, op } from '@app/drizzle/db.ts';
import type * as orm from '@app/drizzle/orm.ts';
import * as schema from '@app/drizzle/schema';
import { NotFoundError } from '@app/lib/error.ts';
import { Security, Tag } from '@app/lib/openapi/index.ts';
import { EpisodeCollectionStatus, PersonType } from '@app/lib/subject/type.ts';
import { fetchTimelineByIDs } from '@app/lib/timeline/item.ts';
import { getTimelineUser } from '@app/lib/timeline/user';
import * as convert from '@app/lib/types/convert.ts';
import * as fetcher from '@app/lib/types/fetcher.ts';
import * as req from '@app/lib/types/req.ts';
import * as res from '@app/lib/types/res.ts';
import {
  countUserBlog,
  countUserFriend,
  countUserGroup,
  countUserIndex,
  countUserMonoCollection,
  countUserSubjectCollection,
} from '@app/lib/user/stats.ts';
import { isFriends } from '@app/lib/user/utils.ts';
import { requireLogin } from '@app/routes/hooks/pre-handler.ts';
import type { App } from '@app/routes/type.ts';

export type IUserSubjectCollection = Static<typeof UserSubjectCollection>;
const UserSubjectCollection = t.Object(
  {
    subject: res.Ref(res.Subject),
    rate: t.Integer(),
    type: res.Ref(res.CollectionType),
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
    episode: res.Ref(res.Episode),
    type: res.Ref(req.EpisodeCollectionStatus),
  },
  { $id: 'UserSubjectEpisodeCollection' },
);

export type IUserCharacterCollection = Static<typeof UserCharacterCollection>;
const UserCharacterCollection = t.Object(
  {
    character: res.Ref(res.Character),
    createdAt: t.Integer(),
  },
  { $id: 'UserCharacterCollection' },
);

export type IUserPersonCollection = Static<typeof UserPersonCollection>;
const UserPersonCollection = t.Object(
  {
    person: res.Ref(res.Person),
    createdAt: t.Integer(),
  },
  { $id: 'UserPersonCollection' },
);

export type IUserIndexCollection = Static<typeof UserIndexCollection>;
const UserIndexCollection = t.Object(
  {
    index: res.Ref(res.Index),
    createdAt: t.Integer(),
  },
  { $id: 'UserIndexCollection' },
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
    private: interest.private,
    updatedAt: interest.updatedAt,
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
          200: res.Ref(res.User),
        },
      },
    },
    async ({ params: { username } }) => {
      const [data] = await db
        .select()
        .from(schema.chiiUsers)
        .innerJoin(schema.chiiUserFields, op.eq(schema.chiiUsers.id, schema.chiiUserFields.uid))
        .where(op.eq(schema.chiiUsers.username, username));
      if (!data) {
        throw new NotFoundError(`user ${username}`);
      }
      const user = convert.toUser(data.chii_members, data.chii_memberfields);
      user.stats.blog = await countUserBlog(user.id);
      user.stats.friend = await countUserFriend(user.id);
      user.stats.group = await countUserGroup(user.id);
      user.stats.index = await countUserIndex(user.id);
      user.stats.mono = await countUserMonoCollection(user.id);
      user.stats.subject = await countUserSubjectCollection(user.id);
      const svcs = await db
        .select()
        .from(schema.chiiUserNetworkServices)
        .where(
          op.and(
            op.ne(schema.chiiUserNetworkServices.account, ''),
            op.eq(schema.chiiUserNetworkServices.uid, user.id),
          ),
        );
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
          200: res.Paged(res.Ref(res.Friend)),
        },
      },
    },
    async ({ params: { username }, query: { limit = 20, offset = 0 } }) => {
      const user = await fetcher.fetchSlimUserByUsername(username);
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
    '/users/:username/followers',
    {
      schema: {
        summary: '获取用户的关注者列表',
        operationId: 'getUserFollowers',
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
          200: res.Paged(res.Ref(res.Friend)),
        },
      },
    },
    async ({ params: { username }, query: { limit = 20, offset = 0 } }) => {
      const user = await fetcher.fetchSlimUserByUsername(username);
      if (!user) {
        throw new NotFoundError('user');
      }

      const conditions = op.and(op.eq(schema.chiiFriends.fid, user.id));

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
        .innerJoin(schema.chiiUsers, op.eq(schema.chiiFriends.uid, schema.chiiUsers.id))
        .where(conditions)
        .orderBy(op.desc(schema.chiiFriends.createdAt))
        .limit(limit)
        .offset(offset)
        .execute();
      const followers = data.map((d) => convert.toFriend(d.chii_members, d.chii_friends));

      return {
        data: followers,
        total: count,
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
          subjectType: t.Optional(req.Ref(req.SubjectType)),
          type: t.Optional(req.Ref(req.CollectionType)),
          since: t.Optional(t.Integer({ minimum: 0, description: '起始时间戳' })),
          limit: t.Optional(
            t.Integer({ default: 20, minimum: 1, maximum: 100, description: 'max 100' }),
          ),
          offset: t.Optional(t.Integer({ default: 0, minimum: 0, description: 'min 0' })),
        }),
        response: {
          200: res.Paged(res.Ref(UserSubjectCollection)),
        },
      },
    },
    async ({
      auth,
      params: { username },
      query: { subjectType, type, since, limit = 20, offset = 0 },
    }) => {
      const user = await fetcher.fetchSlimUserByUsername(username);
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
        auth.userID === user.id ? undefined : op.eq(schema.chiiSubjectInterests.private, false),
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
        .where(conditions);

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
        .offset(offset);

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
          200: res.Ref(UserSubjectCollection),
        },
      },
    },
    async ({ auth, params: { username, subjectID } }) => {
      const user = await fetcher.fetchSlimUserByUsername(username);
      if (!user) {
        throw new NotFoundError('user');
      }

      const conditions = op.and(
        op.eq(schema.chiiSubjectInterests.uid, user.id),
        op.eq(schema.chiiSubjectInterests.subjectID, subjectID),
        op.ne(schema.chiiSubjectInterests.type, 0),
        op.ne(schema.chiiSubjects.ban, 1),
        op.eq(schema.chiiSubjectFields.fieldRedirect, 0),
        auth.userID === user.id ? undefined : op.eq(schema.chiiSubjectInterests.private, false),
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
        .where(conditions);

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
          type: t.Optional(req.Ref(req.EpisodeType)),
          limit: t.Optional(
            t.Integer({ default: 100, minimum: 1, maximum: 1000, description: 'max 1000' }),
          ),
          offset: t.Optional(t.Integer({ default: 0, minimum: 0, description: 'min 0' })),
        }),
        response: {
          200: res.Paged(res.Ref(UserSubjectEpisodeCollection)),
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
      const collections = data.map((d) => ({
        episode: convert.toSlimEpisode(d),
        type: epStatus[d.id]?.type ?? EpisodeCollectionStatus.None,
      }));

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
          200: res.Ref(UserSubjectEpisodeCollection),
        },
      },
      preHandler: [requireLogin('get subject episode collection')],
    },
    async ({ auth, params: { episodeID } }) => {
      const episode = await fetcher.fetchEpisodeByID(episodeID);
      if (!episode) {
        throw new NotFoundError(`episode ${episodeID}`);
      }
      const epStatus = await fetcher.fetchSubjectEpStatus(auth.userID, episode.subjectID);
      if (!epStatus) {
        throw new NotFoundError(`status of episode ${episodeID}`);
      }
      return {
        episode,
        type: epStatus[episodeID]?.type ?? EpisodeCollectionStatus.None,
      };
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
        response: {
          200: res.Paged(res.Ref(UserCharacterCollection)),
        },
      },
    },
    async ({ auth, params: { username }, query: { limit = 20, offset = 0 } }) => {
      const user = await fetcher.fetchSlimUserByUsername(username);
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
        .where(conditions);

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
        .offset(offset);
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
          200: res.Ref(UserCharacterCollection),
        },
      },
    },
    async ({ auth, params: { username, characterID } }) => {
      const user = await fetcher.fetchSlimUserByUsername(username);
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
        .where(conditions);

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
        response: {
          200: res.Paged(res.Ref(UserPersonCollection)),
        },
      },
    },
    async ({ auth, params: { username }, query: { limit = 20, offset = 0 } }) => {
      const user = await fetcher.fetchSlimUserByUsername(username);
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
        .where(conditions);

      const data = await db
        .select()
        .from(schema.chiiPersonCollects)
        .innerJoin(schema.chiiPersons, op.eq(schema.chiiPersonCollects.mid, schema.chiiPersons.id))
        .where(conditions)
        .orderBy(op.desc(schema.chiiPersonCollects.createdAt))
        .limit(limit)
        .offset(offset);
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
          200: res.Ref(UserPersonCollection),
        },
      },
    },
    async ({ auth, params: { username, personID } }) => {
      const user = await fetcher.fetchSlimUserByUsername(username);
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
        .where(conditions);

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
        response: {
          200: res.Paged(res.Ref(UserIndexCollection)),
        },
      },
    },
    async ({ params: { username }, query: { limit = 20, offset = 0 } }) => {
      const user = await fetcher.fetchSlimUserByUsername(username);
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
        .where(conditions);

      const data = await db
        .select()
        .from(schema.chiiIndexCollects)
        .innerJoin(schema.chiiIndexes, op.eq(schema.chiiIndexCollects.mid, schema.chiiIndexes.id))
        .innerJoin(schema.chiiUsers, op.eq(schema.chiiIndexes.uid, schema.chiiUsers.id))
        .where(conditions)
        .orderBy(op.desc(schema.chiiIndexCollects.createdAt))
        .limit(limit)
        .offset(offset);
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
          200: res.Ref(UserIndexCollection),
        },
      },
    },
    async ({ params: { username, indexID } }) => {
      const user = await fetcher.fetchSlimUserByUsername(username);
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
        .where(conditions);

      for (const d of data) {
        return toUserIndexCollection(d.chii_index_collects, d.chii_index, d.chii_members);
      }

      throw new NotFoundError('collection');
    },
  );

  app.get(
    '/users/:username/groups',
    {
      schema: {
        summary: '获取用户加入的小组',
        operationId: 'getUserGroups',
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
        response: {
          200: res.Paged(res.Ref(res.SlimGroup)),
        },
      },
    },
    async ({ auth, params: { username }, query: { limit = 20, offset = 0 } }) => {
      const user = await fetcher.fetchSlimUserByUsername(username);
      if (!user) {
        throw new NotFoundError('user');
      }

      const [{ count = 0 } = {}] = await db
        .select({ count: op.count() })
        .from(schema.chiiGroupMembers)
        .where(op.eq(schema.chiiGroupMembers.uid, user.id));

      const data = await db
        .select({ id: schema.chiiGroupMembers.gid })
        .from(schema.chiiGroupMembers)
        .where(op.eq(schema.chiiGroupMembers.uid, user.id))
        .orderBy(op.desc(schema.chiiGroupMembers.createdAt))
        .limit(limit)
        .offset(offset);
      const groupIDs = data.map((d) => d.id);
      const groups = await fetcher.fetchSlimGroupsByIDs(groupIDs, auth.allowNsfw);

      const result = [];
      for (const gid of groupIDs) {
        const group = groups[gid];
        if (group) {
          result.push(group);
        }
      }

      return {
        data: result,
        total: count,
      };
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
        response: {
          200: res.Paged(res.Ref(res.SlimIndex)),
        },
      },
    },
    async ({ params: { username }, query: { limit = 20, offset = 0 } }) => {
      const user = await fetcher.fetchSlimUserByUsername(username);
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
        .where(conditions);

      const data = await db
        .select()
        .from(schema.chiiIndexes)
        .where(conditions)
        .orderBy(op.desc(schema.chiiIndexes.createdAt))
        .limit(limit)
        .offset(offset);
      const indexes = data.map((d) => convert.toSlimIndex(d));

      return {
        data: indexes,
        total: count,
      };
    },
  );

  app.get(
    '/users/:username/blogs',
    {
      schema: {
        summary: '获取用户创建的日志',
        operationId: 'getUserBlogs',
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
        response: {
          200: res.Paged(res.Ref(res.SlimBlogEntry)),
        },
      },
    },
    async ({ auth, params: { username }, query: { limit = 20, offset = 0 } }) => {
      const user = await fetcher.fetchSlimUserByUsername(username);
      if (!user) {
        throw new NotFoundError('user');
      }

      const isFriend = await isFriends(user.id, auth.userID);
      const conditions = [op.eq(schema.chiiBlogEntries.uid, user.id)];
      if (auth.userID !== user.id && !isFriend) {
        conditions.push(op.eq(schema.chiiBlogEntries.public, true));
      }

      const [{ count = 0 } = {}] = await db
        .select({ count: op.count() })
        .from(schema.chiiBlogEntries)
        .where(op.and(...conditions));

      const data = await db
        .select()
        .from(schema.chiiBlogEntries)
        .where(op.and(...conditions))
        .orderBy(op.desc(schema.chiiBlogEntries.createdAt))
        .limit(limit)
        .offset(offset);
      const blogs = data.map((d) => convert.toSlimBlogEntry(d));

      return {
        data: blogs,
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
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          username: t.String({ minLength: 1 }),
        }),
        querystring: t.Object({
          limit: t.Optional(
            t.Integer({ default: 20, minimum: 1, maximum: 20, description: 'min 1, max 20' }),
          ),
          until: t.Optional(t.Integer({ description: 'max timeline id to fetch from' })),
        }),
        response: {
          200: t.Array(res.Ref(res.Timeline)),
        },
      },
    },
    async ({ auth, params: { username }, query: { limit = 20, until } }) => {
      const user = await fetcher.fetchSlimUserByUsername(username);
      if (!user) {
        throw new NotFoundError('user');
      }

      const ids = await getTimelineUser(user.id, limit, until);
      const result = await fetchTimelineByIDs(ids, auth.allowNsfw);
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
