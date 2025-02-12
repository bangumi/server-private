import { Type as t } from '@sinclair/typebox';
import { DateTime, Duration } from 'luxon';

import { db, op, schema } from '@app/drizzle';
import { NotAllowedError } from '@app/lib/auth/index.ts';
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
      const token = await db.query.chiiAccessToken.findFirst({
        where: op.eq(schema.chiiAccessToken.id, body.id),
      });

      if (!token) {
        throw new NotAllowedError("delete a token not belong to you or token doesn't exist");
      }

      if (token.userID !== auth.userID.toString()) {
        throw new NotAllowedError("delete a token not belong to you or token doesn't exist");
      }

      await db
        .update(schema.chiiAccessToken)
        .set({ expiredAt: new Date() })
        .where(op.eq(schema.chiiAccessToken.id, body.id));
    },
  );

  app.post(
    '/access-tokens',
    {
      schema: {
        hide: true,
        body: t.Object({
          name: t.String({}),
          days: t.Integer({ minimum: 1 }),
        }),
        response: {
          200: t.String(),
        },
      },
      preHandler: [requireLogin('delete your token')],
    },
    async ({ auth, body: { days, name } }) => {
      const token = await randomBase62String(40);
      await db.insert(schema.chiiAccessToken).values({
        userID: auth.userID.toString(),
        expiredAt: DateTime.now()
          .plus(Duration.fromObject({ day: days }))
          .toJSDate(),
        type: TokenType.AccessToken,
        clientID: '',
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
      const tokens = await db
        .select()
        .from(schema.chiiAccessToken)
        .leftJoin(
          schema.chiiOauthClients,
          op.eq(schema.chiiOauthClients.clientID, schema.chiiAccessToken.clientID),
        )
        .leftJoin(schema.chiiApp, op.eq(schema.chiiApp.id, schema.chiiOauthClients.appID))
        .where(
          op.and(
            op.eq(schema.chiiAccessToken.userID, req.auth.userID.toString()),
            op.gt(schema.chiiAccessToken.expiredAt, new Date()),
          ),
        );

      const data = tokens.map(
        ({ chii_oauth_access_tokens: token, chii_oauth_clients: client, chii_apps: app }) => {
          if (token.type === TokenType.OauthToken) {
            return {
              ...token,
              createdAt: DateTime.fromJSDate(token.expiredAt)
                .plus(Duration.fromObject({ hour: -168 }))
                .toJSDate(),
              name: app?.name ?? '',
              client,
            };
          }

          const info = JSON.parse(token.info) as TokenInfo;

          return {
            ...token,
            client,
            createdAt: DateTime.fromISO(info.created_at).toJSDate(),
            name: info.name,
          };
        },
      );

      await reply.view('token/list', { tokens: data });
    },
  );

  app.get(
    '/access-token/create',
    { preHandler: [redirectIfNotLogin], schema: { hide: true } },
    async (_req, reply) => {
      await reply.view('token/create');
    },
  );
}
