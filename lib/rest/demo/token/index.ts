import { Type as t } from '@sinclair/typebox';
import * as typeorm from 'typeorm';

import { NotAllowedError } from '@app/lib/auth';
import * as orm from '@app/lib/orm';
import type * as entity from '@app/lib/orm/entity';
import { redirectIfNotLogin } from '@app/lib/rest/demo/hooks';
import { requireLogin } from '@app/lib/rest/hooks/pre-handler';
import type { App } from '@app/lib/rest/type';
import * as res from '@app/lib/types/res';
import { randomBase62String } from '@app/lib/utils';
import dayjs from '@app/vendor/dayjs';

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
        expires: dayjs().add(duration_days, 'day').toDate(),
        type: TokenType.AccessToken,
        clientId: '',
        accessToken: token,
        info: JSON.stringify({
          name: name,
          created_at: dayjs().toISOString(),
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

      const user = await orm.fetchUserX(req.auth.userID);

      const data = {
        user: res.userToResCreator(user),
        tokens: tokens.map((x) => {
          const client = cm[x.clientId];
          return {
            ...x,
            ...info(x, client),
            expires: dayjs(x.expires).toDate(),
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
      const user = await orm.fetchUserX(req.auth.userID);

      const data = { user: res.userToResCreator(user) };
      await reply.view('token/create', data);
    },
  );
}

function info(
  token: entity.OauthAccessTokens,
  client?: entity.OauthClient,
): { createdAt: Date; name: string } {
  if (token.type === TokenType.OauthToken) {
    return {
      createdAt: dayjs(token.expires).add(-168, 'hour').toDate(),
      name: client?.app.appName ?? '',
    };
  }

  const info = JSON.parse(token.info) as TokenInfo;

  return {
    createdAt: dayjs(info.created_at).toDate(),
    name: info.name,
  };
}
