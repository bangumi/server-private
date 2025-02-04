import { Type as t } from '@sinclair/typebox';

import { db, op } from '@app/drizzle/db.ts';
import * as schema from '@app/drizzle/schema';
import { Security, Tag } from '@app/lib/openapi/index.ts';
import * as convert from '@app/lib/types/convert.ts';
import * as res from '@app/lib/types/res.ts';
import { requireLogin } from '@app/routes/hooks/pre-handler.ts';
import type { App } from '@app/routes/type.ts';

// eslint-disable-next-line @typescript-eslint/require-await
export async function setup(app: App) {
  app.get(
    '/friends',
    {
      schema: {
        summary: '获取当前用户的好友列表',
        operationId: 'getMyFriends',
        tags: [Tag.Friend],
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

  app.get(
    '/followers',
    {
      schema: {
        summary: '获取当前用户的关注者列表',
        operationId: 'getMyFollowers',
        tags: [Tag.Friend],
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
}
