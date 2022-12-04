import type { FastifyInstance } from 'fastify';
import type { Static } from '@sinclair/typebox';
import { Type as t } from '@sinclair/typebox';

const Req = t.Object({
  username: t.String({ minLength: 1 }),
  password: t.String({ minLength: 1 }),
});

const Res = t.Object({
  token: t.String({ minLength: 1 }),
});

const schema = {
  response: {
    200: Res,
  },
  body: Req,
} as const;

export function setup(app: FastifyInstance) {
  app.post('/login', { schema }, async (): Promise<Static<typeof Res>> => {
    return { token: 'hello' };
  });

  app.get(
    '/me',
    {
      schema: {
        response: {
          200: t.Object({
            data: t.Optional(
              t.Object({
                ID: t.Integer(),
                username: t.String(),
                nickname: t.String(),
              }),
            ),
          }),
        },
      },
    },
    async (req) => {
      return { data: req.user ?? undefined };
    },
  );
}
