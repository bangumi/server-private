import { type Static, Type as t } from '@sinclair/typebox';
import fastifySocketIO from 'fastify-socket.io';
import type { Server } from 'socket.io';

import { db, op } from '@app/drizzle/db';
import * as schema from '@app/drizzle/schema.ts';
import { NeedLoginError } from '@app/lib/auth/index.ts';
import * as session from '@app/lib/auth/session.ts';
import { CookieKey } from '@app/lib/auth/session.ts';
import { UnexpectedNotFoundError } from '@app/lib/error.ts';
import { avatar } from '@app/lib/images';
import { Notify } from '@app/lib/notify.ts';
import { Security, Tag } from '@app/lib/openapi/index.ts';
import { fetchUsers, UserFieldRepo } from '@app/lib/orm/index.ts';
import { Subscriber } from '@app/lib/redis.ts';
import * as convert from '@app/lib/types/convert.ts';
import * as res from '@app/lib/types/res.ts';
import { fetchFriends } from '@app/lib/user/utils';
import { intval } from '@app/lib/utils';
import { requireLogin } from '@app/routes/hooks/pre-handler';
import type { App } from '@app/routes/type.ts';

const NoticeRes = t.Object(
  {
    id: t.Integer(),
    title: t.String(),
    type: t.Integer({ description: '查看 `./lib/notify.ts` _settings' }),
    sender: res.SlimUser,
    topicID: t.Integer(),
    postID: t.Integer(),
    createdAt: t.Integer({ description: 'unix timestamp in seconds' }),
    unread: t.Boolean(),
  },
  { $id: 'Notice' },
);

declare module 'fastify' {
  interface FastifyInstance {
    io: Server;
  }
}

export async function setup(app: App) {
  app.get(
    '/me',
    {
      schema: {
        summary: '获取当前用户信息',
        operationId: 'getCurrentUser',
        tags: [Tag.Misc],
        security: [{ [Security.CookiesSession]: [] }],
        response: {
          200: res.Ref(res.Profile),
          401: res.Ref(res.Error, {
            examples: [res.formatError(new NeedLoginError('get current user'))],
          }),
        },
      },
      preHandler: [requireLogin('get current user')],
    },
    async function ({ auth }): Promise<Static<typeof res.Profile>> {
      const [u] = await db
        .select()
        .from(schema.chiiUsers)
        .innerJoin(schema.chiiUserFields, op.eq(schema.chiiUsers.id, schema.chiiUserFields.uid))
        .where(op.eq(schema.chiiUsers.id, auth.userID))
        .limit(1);
      if (!u) {
        throw new UnexpectedNotFoundError(`user ${auth.userID}`);
      }
      const friendIDs = await fetchFriends(auth.userID);
      return {
        id: u.chii_members.id,
        username: u.chii_members.username,
        nickname: u.chii_members.nickname,
        avatar: avatar(u.chii_members.avatar),
        sign: u.chii_members.sign,
        group: u.chii_members.groupid,
        joinedAt: u.chii_members.regdate,
        friendIDs,
        site: u.chii_memberfields.site,
        location: u.chii_memberfields.location,
        bio: u.chii_memberfields.bio,
        permissions: {
          subjectWikiEdit: auth.permission.subject_edit ?? false,
        },
      };
    },
  );

  app.addSchema(NoticeRes);

  app.get(
    '/notify',
    {
      schema: {
        summary: '获取未读通知',
        operationId: 'listNotice',
        tags: [Tag.Misc],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        querystring: t.Object({
          limit: t.Optional(t.Integer({ default: 20, maximum: 40, description: 'max 40' })),
          unread: t.Optional(t.Boolean()),
        }),
        response: {
          200: res.Paged(res.Ref(NoticeRes)),
          401: res.Ref(res.Error, {
            description: '未登录',
            'x-examples': {
              NeedLoginError: {
                value: res.formatError(new NeedLoginError('getting notifications')),
              },
            },
          }),
        },
      },
    },
    async ({ auth: { userID }, query: { limit = 20, unread } }) => {
      const data = await Notify.list(userID, { limit, unread });
      if (data.length === 0) {
        return { total: 0, data: [] };
      }

      const users = await fetchUsers(data.map((x) => x.fromUid));

      return {
        total: await Notify.count(userID),
        data: data.map((x) => {
          const u = users[x.fromUid];
          if (!u) {
            throw new UnexpectedNotFoundError(`user ${x.fromUid}`);
          }

          return {
            ...x,
            sender: convert.oldToUser(u),
          };
        }),
      };
    },
  );

  app.post(
    '/clear-notify',
    {
      schema: {
        summary: '标记通知为已读',
        description: ['标记通知为已读', '不传id时会清空所有未读通知'].join('\n\n'),
        operationId: 'clearNotice',
        tags: [Tag.Misc],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        body: t.Object(
          {
            id: t.Optional(t.Array(t.Integer())),
          },
          {
            'x-examples': {
              ClearAll: { value: {} },
              ClearSome: { value: { id: [1, 2] } },
            },
          },
        ),
        response: {
          200: t.Null({ description: '没有返回值' }),
          401: res.Ref(res.Error, {
            description: '未登录',
            'x-examples': {
              NeedLoginError: {
                value: res.formatError(new NeedLoginError('marking notifications as read')),
              },
            },
          }),
        },
      },
    },
    async ({ auth: { userID }, body: { id } }) => {
      if (id?.length === 0) {
        id = undefined;
      }

      await Notify.markAllAsRead(userID, id);
    },
  );

  app.get(
    '/blocklist',
    {
      schema: {
        summary: '获取绝交用户列表',
        operationId: 'getBlocklist',
        tags: [Tag.Misc],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        response: {
          200: t.Object({
            blocklist: t.Array(t.Integer()),
          }),
        },
      },
      preHandler: [requireLogin('get blocklist')],
    },
    async ({ auth: { userID } }) => {
      const f = await UserFieldRepo.findOneOrFail({ where: { uid: userID } });
      return {
        blocklist: f.blocklist
          .split(',')
          .map((x) => x.trim())
          .map((x) => intval(x)),
      };
    },
  );

  app.post(
    '/blocklist',
    {
      schema: {
        summary: '将用户添加到绝交列表',
        operationId: 'addToBlocklist',
        tags: [Tag.Misc],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        body: t.Object({
          id: t.Integer(),
        }),
        response: {
          200: t.Object({
            blocklist: t.Array(t.Integer()),
          }),
        },
      },
      preHandler: [requireLogin('add to blocklist')],
    },
    async ({ auth: { userID }, body: { id } }) => {
      const f = await UserFieldRepo.findOneOrFail({ where: { uid: userID } });
      const blocklist = f.blocklist.split(',').map((x) => intval(x.trim()));
      if (!blocklist.includes(id)) {
        blocklist.push(id);
      }
      f.blocklist = blocklist.join(',');
      await UserFieldRepo.save(f);
      return { blocklist: blocklist };
    },
  );

  app.delete(
    '/blocklist/:id',
    {
      schema: {
        summary: '将用户从绝交列表移出',
        operationId: 'removeFromBlocklist',
        tags: [Tag.Misc],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          id: t.Integer(),
        }),
        response: {
          200: t.Object({
            blocklist: t.Array(t.Integer()),
          }),
        },
      },
      preHandler: [requireLogin('remove from blocklist')],
    },
    async ({ auth: { userID }, params: { id } }) => {
      const f = await UserFieldRepo.findOneOrFail({ where: { uid: userID } });
      let blocklist = f.blocklist.split(',').map((x) => intval(x.trim()));
      blocklist = blocklist.filter((v) => v !== id);
      f.blocklist = blocklist.join(',');
      await UserFieldRepo.save(f);
      return { blocklist: blocklist };
    },
  );

  await app.register(fastifySocketIO, {
    path: '/p1/socket-io/',
  });

  app.io.on('connection', async (socket) => {
    if (!socket.request.headers.cookie) {
      socket.disconnect(true);
      return;
    }

    const cookie = app.parseCookie(socket.request.headers.cookie);

    const sessionID = cookie[CookieKey];

    if (!sessionID) {
      socket.disconnect(true);
      return;
    }

    const a = await session.get(sessionID);

    if (!a) {
      socket.disconnect(true);
      return;
    }

    const userID = a.userID;
    const watch = `event-user-notify-${userID}`;

    const send = (count: number) => {
      socket.emit('notify', JSON.stringify({ count }));
    };

    const callback = (pattern: string, ch: string, msg: string) => {
      if (ch !== watch) {
        return;
      }

      const { new_notify } = JSON.parse(msg) as { new_notify: number };
      send(new_notify);
    };

    Subscriber.addListener('pmessage', callback);

    socket.on('disconnect', () => {
      Subscriber.removeListener('pmessage', callback);
    });

    const count = await Notify.count(userID);

    send(count);
  });
}
