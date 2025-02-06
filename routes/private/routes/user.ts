import { Type as t } from '@sinclair/typebox';

import { db, op } from '@app/drizzle/db.ts';
import * as schema from '@app/drizzle/schema';
import { NotFoundError } from '@app/lib/error.ts';
import { Security, Tag } from '@app/lib/openapi/index.ts';
import { CollectionPrivacy, PersonType } from '@app/lib/subject/type.ts';
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
import type { App } from '@app/routes/type.ts';

// eslint-disable-next-line @typescript-eslint/require-await
export async function setup(app: App) {
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
          200: res.Paged(res.Ref(res.SlimUser)),
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
        .select({ count: op.count() })
        .from(schema.chiiFriends)
        .where(conditions);

      const data = await db
        .select({ fid: schema.chiiFriends.fid })
        .from(schema.chiiFriends)
        .where(conditions)
        .orderBy(op.desc(schema.chiiFriends.createdAt))
        .limit(limit)
        .offset(offset);

      const fids = data.map((d) => d.fid);
      const result = await fetcher.fetchSlimUsersByIDs(fids);
      const friends = [];
      for (const fid of fids) {
        const friend = result[fid];
        if (friend) {
          friends.push(friend);
        }
      }

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
          200: res.Paged(res.Ref(res.SlimUser)),
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
        .select({ count: op.count() })
        .from(schema.chiiFriends)
        .where(conditions);

      const data = await db
        .select({ uid: schema.chiiFriends.uid })
        .from(schema.chiiFriends)
        .where(conditions)
        .orderBy(op.desc(schema.chiiFriends.createdAt))
        .limit(limit)
        .offset(offset);

      const uids = data.map((d) => d.uid);
      const result = await fetcher.fetchSlimUsersByIDs(uids);
      const followers = [];
      for (const uid of uids) {
        const follower = result[uid];
        if (follower) {
          followers.push(follower);
        }
      }

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
          limit: t.Optional(
            t.Integer({ default: 20, minimum: 1, maximum: 100, description: 'max 100' }),
          ),
          offset: t.Optional(t.Integer({ default: 0, minimum: 0, description: 'min 0' })),
        }),
        response: {
          200: res.Paged(res.Ref(res.SlimSubject)),
        },
      },
    },
    async ({
      auth,
      params: { username },
      query: { subjectType, type, limit = 20, offset = 0 },
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
        op.ne(schema.chiiSubjects.ban, 1),
        op.eq(schema.chiiSubjectFields.redirect, 0),
        op.eq(schema.chiiSubjectInterests.privacy, CollectionPrivacy.Public),
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

      const collections = data.map((d) => {
        const interest = convert.toSlimSubjectInterest(d.chii_subject_interests);
        const subject = convert.toSlimSubject(d.chii_subjects, d.chii_subject_fields);
        return {
          ...subject,
          interest,
        };
      });

      return {
        data: collections,
        total: count,
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
          200: res.Paged(res.Ref(res.SlimCharacter)),
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
      const collection = data.map((d) => convert.toSlimCharacter(d.chii_characters));

      return {
        data: collection,
        total: count,
      };
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
          200: res.Paged(res.Ref(res.SlimPerson)),
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
      const collection = data.map((d) => convert.toSlimPerson(d.chii_persons));

      return {
        data: collection,
        total: count,
      };
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
        .where(conditions)
        .orderBy(op.desc(schema.chiiIndexCollects.createdAt))
        .limit(limit)
        .offset(offset);
      const collection = data.map((d) => convert.toSlimIndex(d.chii_index));

      return {
        data: collection,
        total: count,
      };
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
      const result = await fetchTimelineByIDs(auth, ids);
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
