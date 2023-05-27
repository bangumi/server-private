import { Type as t } from '@sinclair/typebox';
import { DateTime, Duration } from 'luxon';
import * as typeorm from 'typeorm';

import { NotAllowedError } from '@app/lib/auth/index.ts';
import type * as entity from '@app/lib/orm/entity/index.ts';
import * as orm from '@app/lib/orm/index.ts';
import { randomBase62String } from '@app/lib/utils/index.ts';
import { redirectIfNotLogin, requireLogin } from '@app/routes/hooks/pre-handler.ts';
import type { App } from '@app/routes/type.ts';

export const enum TokenType {
  OauthToken = 0,
  AccessToken = 1,
}

interface TokenInfo {
  created_at: string; // RFC3339 string
  name: string;
}

export function setup(app: App) {
  app.delete(
    '/access-tokens',
    {
      schema: {
        hide: true,
        body: t.Object({ id: t.Integer() }),
      },
      preHandler: [requireLogin('delete your token')],
    },
    async ({ auth, body }) => {
      const token = await orm.AccessTokenRepo.findOneBy({ id: body.id });

      if (!token) {
        throw new NotAllowedError("delete a token not belong to you or token doesn't exist");
      }

      if (token.userId !== auth.userID.toString()) {
        throw new NotAllowedError("delete a token not belong to you or token doesn't exist");
      }

      await orm.AccessTokenRepo.update({ id: body.id }, { expires: new Date() });
    },
  );

  app.post(
    '/access-tokens',
    {
      schema: {
        hide: true,
        body: t.Object({
          name: t.String({}),
          duration_days: t.Integer({ exclusiveMinimum: 0 }),
        }),
        response: {
          200: t.String(),
        },
      },
      preHandler: [requireLogin('delete your token')],
    },
    async ({ auth, body: { duration_days, name } }) => {
      const token = await randomBase62String(40);
      await orm.AccessTokenRepo.insert({
        userId: auth.userID.toString(),
        expires: DateTime.now()
          .plus(Duration.fromObject({ day: duration_days }))
          .toJSDate(),
        type: TokenType.AccessToken,
        clientId: '',
        accessToken: token,
        info: JSON.stringify({
          name: name,
          created_at: new Date().toISOString(),
        } satisfies TokenInfo),
      });

      return JSON.stringify(token);
    },
  );

  app.get(
    '/access-token',
    {
      preHandler: [redirectIfNotLogin],
      schema: { hide: true },
    },
    async (req, reply) => {
      const tokens = await orm.AccessTokenRepo.findBy({
        userId: req.auth.userID.toString(),
        expires: typeorm.MoreThan(new Date()),
      });

      const clients = await orm.OauthClientRepo.findBy({
        clientID: typeorm.In(tokens.map((x) => x.clientId)),
      });

      const cm = Object.fromEntries(clients.map((x) => [x.clientID, x]));

      const data = {
        tokens: tokens.map((x) => {
          const client = cm[x.clientId];
          return {
            ...x,
            ...info(x, client),
            client,
          };
        }),
      };

      await reply.view('token/list', data);
    },
  );

  app.get(
    '/access-token/create',
    { preHandler: [redirectIfNotLogin], schema: { hide: true } },
    async (req, reply) => {
      await reply.view('token/create');
    },
  );
}

function info(
  token: entity.OauthAccessTokens,
  client?: entity.OauthClient,
): { createdAt: Date; name: string } {
  if (token.type === TokenType.OauthToken) {
    return {
      createdAt: DateTime.fromJSDate(token.expires)
        .plus(Duration.fromObject({ hour: -168 }))
        .toJSDate(),
      name: client?.app.appName ?? '',
    };
  }

  const info = JSON.parse(token.info) as TokenInfo;

  return {
    createdAt: DateTime.fromISO(info.created_at).toJSDate(),
    name: info.name,
  };
}
