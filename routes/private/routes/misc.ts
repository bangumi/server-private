import { type Static, Type as t } from '@sinclair/typebox';
import fastifySocketIO from 'fastify-socket.io';
import type { Server } from 'socket.io';

import { db, op, schema } from '@app/drizzle';
import { NeedLoginError } from '@app/lib/auth/index.ts';
import * as session from '@app/lib/auth/session.ts';
import { CookieKey } from '@app/lib/auth/session.ts';
import { UnexpectedNotFoundError } from '@app/lib/error.ts';
import { avatar } from '@app/lib/images';
import { Notify } from '@app/lib/notify.ts';
import { Security, Tag } from '@app/lib/openapi/index.ts';
import { Subscriber } from '@app/lib/redis.ts';
import * as fetcher from '@app/lib/types/fetcher.ts';
import * as res from '@app/lib/types/res.ts';
import { fetchFriends, parseBlocklist } from '@app/lib/user/utils';
import { requireLogin } from '@app/routes/hooks/pre-handler';
import type { App } from '@app/routes/type.ts';

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
        blocklist: parseBlocklist(u.chii_memberfields.blocklist),
        site: u.chii_memberfields.site,
        location: u.chii_memberfields.location,
        bio: u.chii_memberfields.bio,
        permissions: {
          subjectWikiEdit: auth.permission.subject_edit ?? false,
        },
      };
    },
  );

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
          200: res.Paged(res.Ref(res.Notice)),
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
    async ({ auth, query: { limit = 20, unread } }) => {
      const data = await Notify.list(auth.userID, { limit, unread });
      if (data.length === 0) {
        return { total: 0, data: [] };
      }

      const users = await fetcher.fetchSlimUsersByIDs(data.map((x) => x.fromUid));

      return {
        total: await Notify.count(auth.userID),
        data: data.map((x) => {
          const sender = users[x.fromUid];
          if (!sender) {
            throw new UnexpectedNotFoundError(`user ${x.fromUid}`);
          }
          return {
            ...x,
            sender,
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
