import * as crypto from 'node:crypto';

import * as bcrypt from 'bcrypt';
import type { Static } from '@sinclair/typebox';
import { Type as t } from '@sinclair/typebox';
import { createError } from '@fastify/error';
import httpCodes from 'http-status-codes';

import { redisPrefix } from '../../config';
import { Tag } from '../../openapi';
import redis from '../../redis';
import type { IUser } from '../../types/user';
import { User } from '../../types/user';
import prisma from '../../prisma';
import { randomBase62String } from '../../utils';
import type { App } from '../type';
import Limiter from '../../utils/rate-limit';

const CookieKey = 'sessionID';

const TooManyRequestsError = createError(
  'TOO_MANY_REQUESTS',
  'too many failed login attempts',
  httpCodes.TOO_MANY_REQUESTS,
);

const EmailPasswordNotMatch = createError(
  'EMAIL_PASSWORD_MISMATCH',
  'email does not exists or email and password not match',
  httpCodes.UNAUTHORIZED,
);

const emailPassMismatchError = t.Object({
  title: t.String(),
  description: t.String(),
  detail: t.Object({
    remain: t.Integer({ description: '剩余可用登录次数。' }),
  }),
});

export function setup(app: App) {
  // 10 calls per 600s
  const limiter = new Limiter({
    redisClient: redis,
    limit: 10,
    duration: 600,
  });

  app.post(
    '/login',
    {
      schema: {
        operationId: 'auth-login',
        tags: [Tag.Auth],
        response: {
          [httpCodes.OK]: t.Ref(User),
          [httpCodes.UNAUTHORIZED]: emailPassMismatchError,
        },
        body: t.Object({
          email: t.String({ minLength: 1 }),
          password: t.String({ minLength: 1 }),
        }),
      },
    },
    async function handler({ body: { email, password }, ip }, res): Promise<IUser> {
      const { remain, reset } = await limiter.get(`${redisPrefix}-login-rate-limit-${ip}`);
      if (remain <= 0) {
        void res.header('Retry-After', reset);
        throw new TooManyRequestsError();
      }

      const user = await prisma.members.findFirst({ where: { email } });

      if (!user) {
        return res.code(401).send({
          title: '',
          description: '',
          detail: { remain },
        } satisfies Static<typeof emailPassMismatchError>);
      }

      if (!(await comparePassword(user.password_crypt, password))) {
        throw new EmailPasswordNotMatch();
      }

      const now = Math.trunc(Date.now() / 1000);

      const token = randomBase62String(32);

      const value = {
        reg_time: user.regdate,
        user_id: user.id,
        created_at: now,
        expired_at: now + 60 * 60 * 24 * 7,
      };

      await prisma.chii_os_web_sessions.create({
        data: {
          value: Buffer.from(JSON.stringify(value)),
          user_id: user.id,
          created_at: value.created_at,
          expired_at: value.expired_at,
          key: token,
        },
      });

      void res.cookie(CookieKey, token, { sameSite: 'strict' });

      return { ID: user.id, username: user.username, nickname: user.nickname };
    },
  );
}

function processPassword(s: string): string {
  return crypto.createHash('md5').update(s).digest('hex');
}

export async function comparePassword(hashed: string, input: string): Promise<boolean> {
  return bcrypt.compare(processPassword(input), hashed);
}
