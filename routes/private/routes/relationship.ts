import { Type as t } from '@sinclair/typebox';
import { DateTime } from 'luxon';

import { db, op, schema } from '@app/drizzle';
import { NotFoundError, UnexpectedNotFoundError } from '@app/lib/error';
import { Security, Tag } from '@app/lib/openapi/index.ts';
import * as convert from '@app/lib/types/convert.ts';
import * as fetcher from '@app/lib/types/fetcher.ts';
import * as res from '@app/lib/types/res.ts';
import { parseBlocklist } from '@app/lib/user/utils.ts';
import { LimitAction } from '@app/lib/utils/rate-limit/index.ts';
import { requireLogin } from '@app/routes/hooks/pre-handler.ts';
import { rateLimit } from '@app/routes/hooks/rate-limit';
import type { App } from '@app/routes/type.ts';

// eslint-disable-next-line @typescript-eslint/require-await
export async function setup(app: App) {
  app.get(
    '/friends',
    {
      schema: {
        summary: '获取当前用户的好友列表',
        operationId: 'getMyFriends',
        tags: [Tag.Relationship],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
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
      preHandler: [requireLogin('get my friends')],
    },
    async ({ auth, query: { limit = 20, offset = 0 } }) => {
      const conditions = op.and(op.eq(schema.chiiFriends.uid, auth.userID));

      const [{ count = 0 } = {}] = await db
        .select({ count: op.count() })
        .from(schema.chiiFriends)
        .where(conditions);

      const data = await db
        .select()
        .from(schema.chiiFriends)
        .innerJoin(schema.chiiUsers, op.eq(schema.chiiFriends.fid, schema.chiiUsers.id))
        .where(conditions)
        .orderBy(op.desc(schema.chiiFriends.createdAt))
        .limit(limit)
        .offset(offset);

      const friends = data.map((d) => convert.toFriend(d.chii_members, d.chii_friends));

      return {
        data: friends,
        total: count,
      };
    },
  );

  app.put(
    '/friends/:username',
    {
      schema: {
        summary: '添加好友',
        operationId: 'addFriend',
        tags: [Tag.Relationship],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          username: t.String(),
        }),
        response: {
          200: t.Object({}),
        },
      },
      preHandler: [requireLogin('add friend')],
    },
    async ({ auth, params: { username } }) => {
      const user = await fetcher.fetchSlimUserByUsername(username);
      if (!user) {
        throw new NotFoundError(`user ${username}`);
      }
      await rateLimit(LimitAction.Relationship, auth.userID);
      await db.transaction(async (t) => {
        const [existing] = await t
          .select()
          .from(schema.chiiFriends)
          .where(
            op.and(
              op.eq(schema.chiiFriends.uid, auth.userID),
              op.eq(schema.chiiFriends.fid, user.id),
            ),
          )
          .limit(1);
        if (existing) {
          return {};
        }
        await t.insert(schema.chiiFriends).values({
          uid: auth.userID,
          fid: user.id,
          createdAt: DateTime.now().toUnixInteger(),
          description: '',
        });
      });
      return {};
    },
  );

  app.delete(
    '/friends/:username',
    {
      schema: {
        summary: '取消好友',
        operationId: 'removeFriend',
        tags: [Tag.Relationship],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          username: t.String(),
        }),
        response: {
          200: t.Object({}),
        },
      },
      preHandler: [requireLogin('remove friend')],
    },
    async ({ auth, params: { username } }) => {
      const user = await fetcher.fetchSlimUserByUsername(username);
      if (!user) {
        throw new NotFoundError(`user ${username}`);
      }
      await rateLimit(LimitAction.Relationship, auth.userID);
      await db
        .delete(schema.chiiFriends)
        .where(
          op.and(
            op.eq(schema.chiiFriends.uid, auth.userID),
            op.eq(schema.chiiFriends.fid, user.id),
          ),
        )
        .limit(1);
      return {};
    },
  );

  app.get(
    '/followers',
    {
      schema: {
        summary: '获取当前用户的关注者列表',
        operationId: 'getMyFollowers',
        tags: [Tag.Relationship],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
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
      preHandler: [requireLogin('get my followers')],
    },
    async ({ auth, query: { limit = 20, offset = 0 } }) => {
      const conditions = op.and(op.eq(schema.chiiFriends.fid, auth.userID));

      const [{ count = 0 } = {}] = await db
        .select({ count: op.count() })
        .from(schema.chiiFriends)
        .where(conditions);

      const data = await db
        .select()
        .from(schema.chiiFriends)
        .innerJoin(schema.chiiUsers, op.eq(schema.chiiFriends.uid, schema.chiiUsers.id))
        .where(conditions)
        .orderBy(op.desc(schema.chiiFriends.createdAt))
        .limit(limit)
        .offset(offset);
      const followers = data.map((d) => convert.toFriend(d.chii_members, d.chii_friends));

      return {
        data: followers,
        total: count,
      };
    },
  );

  app.get(
    '/blocklist',
    {
      schema: {
        summary: '获取当前用户的绝交用户列表',
        operationId: 'getBlocklist',
        tags: [Tag.Relationship],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        response: {
          200: t.Object({
            blocklist: t.Array(t.Integer()),
          }),
        },
      },
      preHandler: [requireLogin('get blocklist')],
    },
    async ({ auth }) => {
      const [field] = await db
        .select()
        .from(schema.chiiUserFields)
        .where(op.eq(schema.chiiUserFields.uid, auth.userID))
        .limit(1);
      if (!field) {
        throw new UnexpectedNotFoundError(`user field ${auth.userID}`);
      }
      return {
        blocklist: parseBlocklist(field.blocklist),
      };
    },
  );

  app.put(
    '/blocklist/:username',
    {
      schema: {
        summary: '与用户绝交',
        operationId: 'addUserToBlocklist',
        tags: [Tag.Relationship],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          username: t.String(),
        }),
        response: {
          200: t.Object({
            blocklist: t.Array(t.Integer()),
          }),
        },
      },
      preHandler: [requireLogin('add user to blocklist')],
    },
    async ({ auth, params: { username } }) => {
      const user = await fetcher.fetchSlimUserByUsername(username);
      if (!user) {
        throw new NotFoundError(`user ${username}`);
      }
      await rateLimit(LimitAction.Relationship, auth.userID);
      const [field] = await db
        .select()
        .from(schema.chiiUserFields)
        .where(op.eq(schema.chiiUserFields.uid, auth.userID))
        .limit(1);
      if (!field) {
        throw new UnexpectedNotFoundError(`user field ${auth.userID}`);
      }
      const blocklist = parseBlocklist(field.blocklist);
      if (!blocklist.includes(user.id)) {
        blocklist.push(user.id);
      }
      await db
        .update(schema.chiiUserFields)
        .set({ blocklist: blocklist.join(',') })
        .where(op.eq(schema.chiiUserFields.uid, auth.userID));
      return { blocklist: blocklist };
    },
  );

  app.delete(
    '/blocklist/:username',
    {
      schema: {
        summary: '取消与用户绝交',
        operationId: 'removeUserFromBlocklist',
        tags: [Tag.Relationship],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          username: t.String(),
        }),
        response: {
          200: t.Object({
            blocklist: t.Array(t.Integer()),
          }),
        },
      },
      preHandler: [requireLogin('remove user from blocklist')],
    },
    async ({ auth, params: { username } }) => {
      const user = await fetcher.fetchSlimUserByUsername(username);
      if (!user) {
        throw new NotFoundError(`user ${username}`);
      }
      await rateLimit(LimitAction.Relationship, auth.userID);
      const [field] = await db
        .select()
        .from(schema.chiiUserFields)
        .where(op.eq(schema.chiiUserFields.uid, auth.userID))
        .limit(1);
      if (!field) {
        throw new UnexpectedNotFoundError(`user field ${auth.userID}`);
      }
      let blocklist = parseBlocklist(field.blocklist);
      blocklist = blocklist.filter((v) => v !== user.id);
      await db
        .update(schema.chiiUserFields)
        .set({ blocklist: blocklist.join(',') })
        .where(op.eq(schema.chiiUserFields.uid, auth.userID));
      return { blocklist: blocklist };
    },
  );
}
