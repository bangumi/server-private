import * as crypto from 'node:crypto';

import * as bcrypt from 'bcrypt';
import { Type as t } from '@sinclair/typebox';
import { createError } from '@fastify/error';

import { Tag } from '../../openapi/tag';
import type { IUser } from '../../types/user';
import { User } from '../../types/user';
import prisma from '../../prisma';
import { randomBase62String } from '../../utils';
import type { App } from '../type';

const CookieKey = 'sessionID';

const EmailPasswordNotMatch = createError(
  'EMAIL_PASSWORD_MISMATCH',
  'email does not exists or email and password not match',
  401,
);

export function setup(app: App) {
  app.post(
    '/login',
    {
      schema: {
        operationId: 'auth-login',
        tags: [Tag.Auth],
        response: {
          200: User,
        },
        body: t.Object({
          email: t.String({ minLength: 1 }),
          password: t.String({ minLength: 1 }),
        }),
      },
    },
    async function handler({ body: { email, password } }, res): Promise<IUser> {
      const user = await prisma.chii_members.findFirst({ where: { email } });

      if (!user) {
        throw new EmailPasswordNotMatch();
      }

      if (!(await comparePassword(user.password_crypt, password))) {
        throw new EmailPasswordNotMatch();
      }

      const now = Math.trunc(Date.now() / 1000);

      const token = randomBase62String(32);

      const value = {
        reg_time: user.regdate,
        user_id: user.uid,
        created_at: now,
        expired_at: now + 60 * 60 * 24 * 7,
      };

      await prisma.chii_os_web_sessions.create({
        data: {
          value: Buffer.from(JSON.stringify(value)),
          user_id: user.uid,
          created_at: value.created_at,
          expired_at: value.expired_at,
          key: token,
        },
      });

      res.cookie(CookieKey, token, { sameSite: 'strict' });

      return { ID: user.uid, username: user.username, nickname: user.nickname };
    },
  );
}

function processPassword(s: string): string {
  return crypto.createHash('md5').update(s).digest().toString('hex');
}

export async function comparePassword(hashed: string, input: string): Promise<boolean> {
  return bcrypt.compare(processPassword(input), hashed);
}
