import { createError } from '@fastify/error';
import type { Static } from '@sinclair/typebox';
import { Type as t } from '@sinclair/typebox';
import httpCodes from 'http-status-codes';

import { comparePassword, NeedLoginError } from '@app/lib/auth';
import * as session from '@app/lib/auth/session';
import { CookieKey } from '@app/lib/auth/session';
import config, { redisPrefix } from '@app/lib/config';
import { UnexpectedNotFoundError } from '@app/lib/error';
import { createTurnstileDriver } from '@app/lib/externals/turnstile';
import { Security, Tag } from '@app/lib/openapi';
import { fetchUser, UserRepo } from '@app/lib/orm';
import redis from '@app/lib/redis';
import { avatar } from '@app/lib/response';
import * as res from '@app/lib/types/res';
import { toResUser } from '@app/lib/types/res';
import Limiter from '@app/lib/utils/rate-limit';
import { requireLogin } from '@app/routes/hooks/pre-handler';
import type { App, Handler } from '@app/routes/type';

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

const clientPermission = t.Object(
  {
    subjectWikiEdit: t.Boolean(),
  },
  { $id: 'Permission' },
);

const currentUser = t.Intersect([res.User, t.Object({ permission: clientPermission })], {
  $id: 'CurrentUser',
});

// eslint-disable-next-line @typescript-eslint/require-await
export async function setup(app: App) {
  // 10 calls per 600s
  const limiter = new Limiter({
    redisClient: redis,
    limit: LimitInTimeWindow,
    duration: 600,
  });

  app.addSchema(res.User);
  app.addSchema(res.Error);
  app.addSchema(res.ValidationError);
  app.addSchema(clientPermission);
  app.addSchema(currentUser);

  app.get(
    '/me',
    {
      websocket: false,
      schema: {
        operationId: 'getCurrentUser',
        tags: [Tag.Auth],
        security: [{ [Security.CookiesSession]: [] }],
        response: {
          200: t.Ref(currentUser),
          401: t.Ref(res.Error, {
            examples: [res.formatError(NeedLoginError('get current user'))],
          }),
        },
      },
    },
    async function ({ auth }): Promise<Static<typeof currentUser>> {
      if (!auth.login) {
        throw new NeedLoginError('getting current user');
      }

      const u = await fetchUser(auth.userID);

      if (!u) {
        throw new UnexpectedNotFoundError(`user ${auth.userID}`);
      }

      return {
        ...toResUser(u),
        permission: {
          subjectWikiEdit: auth.permission.subject_edit ?? false,
        },
      };
    },
  );

  app.post(
    '/logout',
    {
      schema: {
        description: '登出',
        operationId: 'logout',
        tags: [Tag.Auth],
        body: t.Object({}),
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
      preHandler: [requireLogin('logout')],
    },
    async (req, res) => {
      if (!req.auth.login) {
        throw new NeedLoginError('logout');
      }

      const sessionKey = req.cookies[session.CookieKey];

      if (!sessionKey) {
        return;
      }

      await session.revoke(sessionKey);
      void res.clearCookie(CookieKey);
    },
  );

  const turnstile = createTurnstileDriver(config.turnstile.secretKey);

  const loginRequestBody = t.Object(
    {
      email: t.String({ minLength: 1 }),
      password: t.String({ minLength: 1 }),
      'cf-turnstile-response': t.String({ minLength: 1 }),
    },
    {
      $id: 'LoginRequestBody',
      examples: [
        {
          email: 'treeholechan@gmail.com',
          password: 'lovemeplease',
          'cf-turnstile-response': '10000000-aaaa-bbbb-cccc-000000000001',
        },
      ],
    },
  );

  app.addSchema(loginRequestBody);

  const loginSchema = {
    description: `需要 [turnstile](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/)

next.bgm.tv 域名对应的 site-key 为 \`0x4AAAAAAABkMYinukE8nzYS\`

dev.bgm38.com 域名使用测试用的 site-key \`1x00000000000000000000AA\``,
    operationId: 'login2',
    tags: [Tag.Auth],
    response: {
      200: t.Ref(res.User, {
        headers: {
          'Set-Cookie': t.String({ description: `example: "${session.CookieKey}=12345abc"` }),
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
    body: t.Ref(loginRequestBody),
  };

  const loginHandler: Handler<typeof loginSchema> = async function loginHandler(
    { body: { email, password, 'cf-turnstile-response': cfCaptchaResponse }, ip },
    reply,
  ): Promise<res.IUser> {
    const { remain, reset } = await limiter.get(`${redisPrefix}-login-rate-limit-${ip}`);
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

    const user = await UserRepo.findOne({ where: { email } });
    if (!user) {
      throw new EmailOrPasswordError();
    }
    if (!(await comparePassword(user.passwordCrypt, password))) {
      throw new EmailOrPasswordError();
    }

    const token = await session.create({
      id: user.id,
      regTime: user.regdate,
    });

    void reply.cookie(CookieKey, token, {
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60 * 30,
    });

    return {
      ...user,
      user_group: user.groupid,
      avatar: avatar(user.avatar),
    };
  };

  app.post('/login', { schema: { ...loginSchema, operationId: 'login' } }, loginHandler);
  app.post(
    '/login2',
    {
      schema: {
        ...loginSchema,
        deprecated: true,
        description: 'backward compatibility for #login operator',
      },
    },
    loginHandler,
  );
}
