import { Type as t } from '@sinclair/typebox';
import { FastifySSEPlugin } from 'fastify-sse-v2';

import { NeedLoginError } from '@app/lib/auth';
import { UnexpectedNotFoundError } from '@app/lib/error';
import * as Notify from '@app/lib/notify';
import { Security, Tag } from '@app/lib/openapi';
import { fetchUsers } from '@app/lib/orm';
import { Subscriber } from '@app/lib/redis';
import { requireLogin } from '@app/lib/rest/hooks/pre-handler';
import type { App } from '@app/lib/rest/type';
import { formatErrors, Paged, userToResCreator } from '@app/lib/types/res';
import * as res from '@app/lib/types/res';

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

  void app.register(FastifySSEPlugin);
  app.get(
    '/notify/sse',
    {
      schema: {
        description: [
          '## 本 API 不是普通的 HTTP 请求，不要使用 fetch',
          '订阅 sse 通知',
          '前端需要使用 [EventSource](https://developer.mozilla.org/en-US/docs/Web/API/EventSource) 订阅 `notify-change` 事件',
          'example:',
          [
            '```js',
            "const evtSource = new EventSource('/p1/notify/sse');",
            '',
            "evtSource.addEventListener('notify-change', (e) => {",
            '  console.log(e);',
            '  console.log(JSON.parse(e.data));',
            `});`,
            '```',
          ].join('\n'),
        ].join('\n\n'),
        operationId: 'sseNotifyChange',
        response: {
          200: t.Object(
            {},
            {
              description: 'sse 响应',
            },
          ),
          401: {
            'x-examples': formatErrors(NeedLoginError('')),
          },
        },
      },
      preHandler: [requireLogin('subscribing notify')],
    },
    (req, reply) => {
      const listener = subscribeNotifyChange(req.auth.userID, (data) => {
        reply.sse({
          data,
          event: 'notify-change',
        });
      });
      req.socket.on('close', () => {
        Subscriber.removeListener('pmessage', listener);
      });
    },
  );
}

export function subscribeNotifyChange(userID: number, send: (msg: string) => void) {
  const watch = `event-user-notify-${userID}`;

  const callback = (pattern: string, ch: string, msg: string) => {
    if (ch !== watch) {
      return;
    }
    const { new_notify: count } = JSON.parse(msg) as { new_notify: number };
    send(JSON.stringify({ count }));
  };

  Subscriber.addListener('pmessage', callback);

  return callback;
}
