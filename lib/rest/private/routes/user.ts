import fastifyWebsocket from '@fastify/websocket';
import { Type as t } from '@sinclair/typebox';

import { NeedLoginError } from '../../../auth';
import { UnexpectedNotFoundError } from '../../../errors';
import * as Notify from '../../../notify';
import { Security, Tag } from '../../../openapi';
import { fetchUsers } from '../../../orm';
import { requireLogin } from '../../../pre-handler';
import { Subscriber } from '../../../redis';
import { Paged } from '../../../types/res';
import * as res from '../../../types/res';
import type { App } from '../../type';
import { userToResCreator } from './topics';

const NoticeRes = t.Object(
  {
    id: t.Integer(),
    title: t.String(),
    type: t.Integer({ description: '查看 `./lib/notify.ts` _settings' }),
    sender: res.User,
    topicID: t.Integer(),
    postID: t.Integer(),
    createdAt: t.Integer({ description: 'unix timestamp in seconds' }),
  },
  { $id: 'Notice' },
);

// eslint-disable-next-line @typescript-eslint/require-await
export async function setup(app: App) {
  await app.register(fastifyWebsocket);
  app.addSchema(res.Error);
  app.addSchema(res.ValidationError);
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
          limit: t.Optional(t.Integer({ default: 20 })),
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
    async ({ auth: { userID }, query: { limit = 20 } }) => {
      const data = await Notify.list(userID, { unread: true, limit });
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
            sender: userToResCreator(u),
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

  app.get(
    '/sub/notify',
    {
      websocket: true,
      schema: {
        summary: '使用 websocket 订阅通知',
        description: [
          'openapi不能很好的描述websocket api，但是这个 api 只会返回一种数据',
          'swagger 的 `Try it out` 不支持 websocket，所以会直接显示为 404 响应',
        ].join('\n\n'),
        operationId: 'subscribeNotify',
        tags: [Tag.User],
        security: [{ [Security.CookiesSession]: [] }],
        response: {
          200: t.Object({
            count: t.Integer(),
          }),
          401: t.Ref(res.Error, {
            description: '未登录',
            'x-examples': {
              NeedLoginError: { value: res.formatError(NeedLoginError('subscribing notify')) },
            },
          }),
        },
      },
      preHandler: [requireLogin('subscribing notify')],
    },
    (conn, req) => {
      const userID = req.auth.userID;

      const watch = `event-user-notify-${userID}`;

      const callback = (pattern: string, ch: string, msg: string) => {
        if (ch !== watch) {
          return;
        }
        const { count } = JSON.parse(msg) as { count: number };
        conn.socket.send(JSON.stringify({ count }));
      };

      Subscriber.addListener('pmessage', callback);

      conn.socket.on('close', () => {
        Subscriber.removeListener('pmessage', callback);
      });
    },
  );
}
