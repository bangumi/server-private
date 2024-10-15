import { Type as t } from '@sinclair/typebox';
import fastifySocketIO from 'fastify-socket.io';
import type { Server } from 'socket.io';

import { NeedLoginError } from '@app/lib/auth/index.ts';
import * as session from '@app/lib/auth/session.ts';
import { CookieKey } from '@app/lib/auth/session.ts';
import config from '@app/lib/config.ts';
import { BadRequestError, UnexpectedNotFoundError } from '@app/lib/error.ts';
import * as Notify from '@app/lib/notify.ts';
import { Security, Tag } from '@app/lib/openapi/index.ts';
import { fetchUsers, UserFieldRepo } from '@app/lib/orm/index.ts';
import { Subscriber } from '@app/lib/redis.ts';
import * as convert from '@app/lib/types/convert.ts';
import * as res from '@app/lib/types/res.ts';
import { intval } from '@app/lib/utils';
import { requireLogin } from '@app/routes/hooks/pre-handler';
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
declare module 'fastify' {
  interface FastifyInstance {
    io: Server;
  }
}

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
          200: res.Paged(t.Ref(NoticeRes)),
          401: t.Ref(res.Error, {
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
            sender: convert.toUser(u),
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
          200: t.Null({ description: '没有返回值' }),
          401: t.Ref(res.Error, {
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
        tags: [Tag.User],
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
        tags: [Tag.User],
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
        tags: [Tag.User],
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

  const allowedRedirectUris: string[] = ['https://example.com'];

  app.get(
    '/turnstile',
    {
      schema: {
        summary: '获取 Turnstile 令牌',
        description: '为防止滥用，Redirect URI 为白名单机制，如需添加请提交 PR。',
        operationId: 'getTurnstileToken',
        tags: [Tag.User],
        querystring: t.Object({
          theme: t.Optional(
            t.Enum({
              dark: 'dark',
              light: 'light',
              auto: 'auto',
            }),
          ),
          redirect_uri: t.String(),
        }),
      },
    },
    async (req, res) => {
      const redirectUri = req.query.redirect_uri;
      try {
        new URL(redirectUri);
      } catch {
        throw BadRequestError('Invalid redirect URI.');
      }
      if (!allowedRedirectUris.some((allowedUri) => redirectUri.startsWith(allowedUri))) {
        throw BadRequestError(
          `Redirect URI is not in the whitelist, you can PR your redirect URI.`,
        );
      }
      await res.view('turnstile', {
        TURNSTILE_SITE_KEY: config.turnstile.siteKey,
        turnstile_theme: req.query.theme || 'auto',
        redirect_uri: Buffer.from(redirectUri).toString('base64'),
      });
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
