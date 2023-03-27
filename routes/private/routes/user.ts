import { Type as t } from '@sinclair/typebox';
import fastifySocketIO from 'fastify-socket.io';

import { NeedLoginError } from '@app/lib/auth';
import * as session from '@app/lib/auth/session.ts';
import { CookieKey } from '@app/lib/auth/session.ts';
import { UnexpectedNotFoundError } from '@app/lib/error.ts';
import * as Notify from '@app/lib/notify';
import { Security, Tag } from '@app/lib/openapi';
import { fetchUsers } from '@app/lib/orm';
import { Subscriber } from '@app/lib/redis.ts';
import { Paged, toResUser } from '@app/lib/types/res.ts';
import * as res from '@app/lib/types/res.ts';
import type { App } from '@app/routes/type.ts';

const NoticeRes = t.Object(
  {
    id: t.Integer(),
    title: t.String(),
    type: t.Integer({ description: '查看 `./lib/notify.ts` _settings' }),
    sender: res.User,
    topicID: t.Integer(),
    postID: t.Integer(),
    createdAt: t.Integer({ description: 'unix timestamp in seconds' }),
    unread: t.Boolean(),
  },
  { $id: 'Notice' },
);

// eslint-disable-next-line @typescript-eslint/require-await
export async function setup(app: App) {
  app.addSchema(res.Error);
  app.addSchema(NoticeRes);

  app.get(
    '/notify',
    {
      schema: {
        summary: '获取未读通知',
        operationId: 'listNotice',
        tags: [Tag.User],
        security: [{ [Security.CookiesSession]: [] }],
        querystring: t.Object({
          limit: t.Optional(t.Integer({ default: 20, maximum: 40, description: 'max 40' })),
          unread: t.Optional(t.Boolean()),
        }),
        response: {
          200: Paged(t.Ref(NoticeRes)),
          401: t.Ref(res.Error, {
            description: '未登录',
            'x-examples': {
              NeedLoginError: {
                value: res.formatError(NeedLoginError('getting notifications')),
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
            sender: toResUser(u),
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
        tags: [Tag.User],
        security: [{ [Security.CookiesSession]: [] }],
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
          200: t.Void({ description: '没有返回值' }),
          401: t.Ref(res.Error, {
            description: '未登录',
            'x-examples': {
              NeedLoginError: {
                value: res.formatError(NeedLoginError('marking notifications as read')),
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
