import * as crypto from 'node:crypto';

import * as bcrypt from 'bcrypt';
import { Type as t } from '@sinclair/typebox';
import { createError } from '@fastify/error';
import httpCodes from 'http-status-codes';

import { redisPrefix } from '../../config';
import { HCaptcha } from '../../externals/hcaptcha';
import { logger } from '../../logger';
import { Tag } from '../../openapi';
import redis from '../../redis';
import type { IUser } from '../../types';
import { ErrorRes, formatError, User } from '../../types';
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

const CaptchaError = createError('CAPTCHA_ERROR', 'wrong captcha', httpCodes.UNAUTHORIZED);

const UsernameOrPasswordError = createError(
  'USERNAME_PASSWORD_ERROR',
  'email does not exists or email and password not match',
  httpCodes.UNAUTHORIZED,
);

const LimitInTimeWindow = 10;

export function setup(app: App) {
  // 10 calls per 600s
  const limiter = new Limiter({
    redisClient: redis,
    limit: LimitInTimeWindow,
    duration: 600,
  });

  if (!process.env.HCAPTCHA_SECRET_KEY) {
    logger.warn('MISSING env, will fallback to testing key');
  }
  const hCaptcha = new HCaptcha({ secretKey: process.env.HCAPTCHA_SECRET_KEY });

  app.post(
    '/login',
    {
      schema: {
        description: `需要 [hCaptcha的验证码](https://docs.hcaptcha.com/#add-the-hcaptcha-widget-to-your-webpage)

site-key 是 \`4874acee-9c6e-4e47-99ad-e2ea1606961f\``,
        operationId: 'auth-login',
        tags: [Tag.Auth],
        response: {
          200: t.Ref(User, {
            headers: {
              'Set-Cookie': t.String({ description: 'example: "sessionID=12345abc"' }),
            },
          }),
          400: t.Ref(ErrorRes, {
            description: '缺少字段等',
          }),
          401: t.Ref(ErrorRes, {
            description: '验证码错误/账号密码不匹配',
            headers: {
              'X-RateLimit-Remaining': t.Integer({ description: 'remaining rate limit' }),
              'X-RateLimit-Limit': t.Integer({ description: 'total limit per 10 minutes' }),
              'X-RateLimit-Reset': t.Integer({ description: 'seconds to reset rate limit' }),
            },
            'x-examples': {
              CaptchaError: { value: formatError(CaptchaError()) },
              UsernameOrPasswordError: { value: formatError(UsernameOrPasswordError()) },
            },
          }),
          429: t.Ref(ErrorRes, {
            description: '失败次数太多，需要过一段时间再重试',
            headers: {
              'X-RateLimit-Remaining': t.Integer({ description: 'remaining rate limit' }),
              'X-RateLimit-Limit': t.Integer({ description: 'limit per 10 minutes' }),
              'X-RateLimit-Reset': t.Integer({ description: 'seconds to reset rate limit' }),
            },
            examples: [formatError(TooManyRequestsError())],
          }),
        },
        body: t.Object({
          email: t.String({ minLength: 1 }),
          password: t.String({ minLength: 1 }),
          'h-captcha-response': t.String({ minLength: 1 }),
        }),
      },
    },
    async function handler(
      { body: { email, password, 'h-captcha-response': hCaptchaResponse }, clientIP },
      res,
    ): Promise<IUser> {
      const { remain, reset } = await limiter.get(`${redisPrefix}-login-rate-limit-${clientIP}`);
      void res.headers({
        'X-RateLimit-Remaining': remain,
        'X-RateLimit-Limit': LimitInTimeWindow,
        'X-RateLimit-Reset': reset,
      });
      if (remain <= 0) {
        throw new TooManyRequestsError();
      }

      if (!(await hCaptcha.verify(hCaptchaResponse))) {
        throw new CaptchaError();
      }

      const user = await prisma.members.findFirst({ where: { email } });

      if (!user) {
        throw new UsernameOrPasswordError();
      }

      if (!(await comparePassword(user.password_crypt, password))) {
        throw new UsernameOrPasswordError();
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
