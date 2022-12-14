import * as crypto from 'node:crypto';

import { createError } from '@fastify/error';
import { Type as t } from '@sinclair/typebox';
import * as bcrypt from 'bcrypt';
import httpCodes from 'http-status-codes';

import { NeedLoginError } from '../../../auth';
import * as session from '../../../auth/session';
import { HCAPTCHA_SECRET_KEY, redisPrefix, TURNSTILE_SECRET_KEY } from '../../../config';
import { createHCaptchaDriver } from '../../../externals/hcaptcha';
import { createTurnstileDriver } from '../../../externals/turnstile';
import { Tag } from '../../../openapi';
import prisma from '../../../prisma';
import redis from '../../../redis';
import { avatar } from '../../../response';
import * as res from '../../../types/res';
import Limiter from '../../../utils/rate-limit';
import type { App } from '../../type';

export const CookieKey = 'sessionID';

const TooManyRequestsError = createError(
  'TOO_MANY_REQUESTS',
  'too many failed login attempts',
  httpCodes.TOO_MANY_REQUESTS,
);

const CaptchaError = createError('CAPTCHA_ERROR', 'wrong captcha', httpCodes.UNAUTHORIZED);

const EmailOrPasswordError = createError(
  'EMAIL_PASSWORD_ERROR',
  'email does not exists or email and password not match',
  httpCodes.UNAUTHORIZED,
);

const LimitInTimeWindow = 10;

// eslint-disable-next-line @typescript-eslint/require-await
export async function setup(app: App) {
  // 10 calls per 600s
  const limiter = new Limiter({
    redisClient: redis,
    limit: LimitInTimeWindow,
    duration: 600,
  });

  const hCaptcha = createHCaptchaDriver(HCAPTCHA_SECRET_KEY);

  app.addSchema(res.User);
  app.addSchema(res.Error);
  app.addSchema(res.ValidationError);

  app.post(
    '/logout',
    {
      schema: {
        description: '登出',
        operationId: 'logout',
        tags: [Tag.Auth],
        response: {
          200: {},
          401: t.Ref(res.Error, {
            description: '未登录',
            'x-examples': {
              NeedLoginError: { value: res.formatError(NeedLoginError('logout')) },
            },
          }),
        },
      },
    },
    async (req, res) => {
      if (!req.auth.login) {
        throw new NeedLoginError('logout');
      }

      if (!req.cookies.sessionID) {
        throw new Error('missing cookies sessionID');
      }

      void res.clearCookie(CookieKey);
      await session.revoke(req.cookies.sessionID);
    },
  );

  app.post(
    '/login',
    {
      schema: {
        description: `需要 [hCaptcha的验证码](https://docs.hcaptcha.com/#add-the-hcaptcha-widget-to-your-webpage)

site-key 是 \`4874acee-9c6e-4e47-99ad-e2ea1606961f\``,
        operationId: 'login',
        tags: [Tag.Auth],
        response: {
          200: t.Ref(res.User, {
            headers: {
              'Set-Cookie': t.String({ description: 'example: "sessionID=12345abc"' }),
            },
          }),
          400: t.Ref(res.ValidationError),
          401: t.Ref(res.Error, {
            description: '验证码错误/账号密码不匹配',
            headers: {
              'X-RateLimit-Remaining': t.Integer({ description: 'remaining rate limit' }),
              'X-RateLimit-Limit': t.Integer({ description: 'total limit per 10 minutes' }),
              'X-RateLimit-Reset': t.Integer({ description: 'seconds to reset rate limit' }),
            },
            'x-examples': res.formatErrors(new CaptchaError(), new EmailOrPasswordError()),
          }),
          429: t.Ref(res.Error, {
            description: '失败次数太多，需要过一段时间再重试',
            headers: {
              'X-RateLimit-Remaining': t.Integer({ description: 'remaining rate limit' }),
              'X-RateLimit-Limit': t.Integer({ description: 'limit per 10 minutes' }),
              'X-RateLimit-Reset': t.Integer({ description: 'seconds to reset rate limit' }),
            },
            examples: [res.formatError(TooManyRequestsError())],
          }),
        },
        body: t.Object(
          {
            email: t.String({ minLength: 1 }),
            password: t.String({ minLength: 1 }),
            'h-captcha-response': t.String({ minLength: 1 }),
          },
          {
            examples: [
              {
                email: 'treeholechan@gmail.com',
                password: 'lovemeplease',
                'h-captcha-response': '10000000-aaaa-bbbb-cccc-000000000001',
              },
            ],
          },
        ),
      },
    },
    async function handler(
      { body: { email, password, 'h-captcha-response': hCaptchaResponse }, clientIP },
      reply,
    ): Promise<res.IUser> {
      const { remain, reset } = await limiter.get(`${redisPrefix}-login-rate-limit-${clientIP}`);
      void reply.headers({
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
        throw new EmailOrPasswordError();
      }
      if (!(await comparePassword(user.password_crypt, password))) {
        throw new EmailOrPasswordError();
      }

      const token = await session.create({
        id: user.id,
        regTime: user.regdate,
      });

      void reply.cookie(CookieKey, token, { sameSite: 'strict' });

      return {
        ...user,
        user_group: user.groupid,
        avatar: avatar(user.avatar),
      };
    },
  );

  const turnstile = createTurnstileDriver(TURNSTILE_SECRET_KEY);

  app.post(
    '/login2',
    {
      schema: {
        description: `需要 [turnstile](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/)

next.bgm.tv 域名对应的 site-key 为 \`0x4AAAAAAABkMYinukE8nzYS\`

dev.bgm38.com 域名使用测试用的 site-key \`1x00000000000000000000AA\``,
        operationId: 'login2',
        tags: [Tag.Auth],
        response: {
          200: t.Ref(res.User, {
            headers: {
              'Set-Cookie': t.String({ description: 'example: "sessionID=12345abc"' }),
            },
          }),
          400: t.Ref(res.ValidationError),
          401: t.Ref(res.Error, {
            description: '验证码错误/账号密码不匹配',
            headers: {
              'X-RateLimit-Remaining': t.Integer({ description: 'remaining rate limit' }),
              'X-RateLimit-Limit': t.Integer({ description: 'total limit per 10 minutes' }),
              'X-RateLimit-Reset': t.Integer({ description: 'seconds to reset rate limit' }),
            },
            'x-examples': res.formatErrors(new CaptchaError(), new EmailOrPasswordError()),
          }),
          429: t.Ref(res.Error, {
            description: '失败次数太多，需要过一段时间再重试',
            headers: {
              'X-RateLimit-Remaining': t.Integer({ description: 'remaining rate limit' }),
              'X-RateLimit-Limit': t.Integer({ description: 'limit per 10 minutes' }),
              'X-RateLimit-Reset': t.Integer({ description: 'seconds to reset rate limit' }),
            },
            examples: [res.formatError(TooManyRequestsError())],
          }),
        },
        body: t.Object(
          {
            email: t.String({ minLength: 1 }),
            password: t.String({ minLength: 1 }),
            'cf-turnstile-response': t.String({ minLength: 1 }),
          },
          {
            examples: [
              {
                email: 'treeholechan@gmail.com',
                password: 'lovemeplease',
                'cf-turnstile-response': '10000000-aaaa-bbbb-cccc-000000000001',
              },
            ],
          },
        ),
      },
    },
    async function handler(
      { body: { email, password, 'cf-turnstile-response': cfCaptchaResponse }, clientIP },
      reply,
    ): Promise<res.IUser> {
      const { remain, reset } = await limiter.get(`${redisPrefix}-login-rate-limit-${clientIP}`);
      void reply.headers({
        'X-RateLimit-Remaining': remain,
        'X-RateLimit-Limit': LimitInTimeWindow,
        'X-RateLimit-Reset': reset,
      });
      if (remain <= 0) {
        throw new TooManyRequestsError();
      }

      if (!(await turnstile.verify(cfCaptchaResponse))) {
        throw new CaptchaError();
      }

      const user = await prisma.members.findFirst({ where: { email } });
      if (!user) {
        throw new EmailOrPasswordError();
      }
      if (!(await comparePassword(user.password_crypt, password))) {
        throw new EmailOrPasswordError();
      }

      const token = await session.create({
        id: user.id,
        regTime: user.regdate,
      });

      void reply.cookie(CookieKey, token, { sameSite: 'strict' });

      return {
        ...user,
        user_group: user.groupid,
        avatar: avatar(user.avatar),
      };
    },
  );
}

function processPassword(s: string): string {
  return crypto.createHash('md5').update(s).digest('hex');
}

export async function comparePassword(hashed: string, input: string): Promise<boolean> {
  return bcrypt.compare(processPassword(input), hashed);
}
