import { createError } from '@fastify/error';
import httpCodes from 'http-status-codes';
import t from 'typebox';

import { db, op, schema } from '@app/drizzle';
import * as session from '@app/lib/auth/session.ts';
import { CookieKey } from '@app/lib/auth/session.ts';
import config from '@app/lib/config.ts';
import { avatar } from '@app/lib/images.ts';
import { Tag } from '@app/lib/openapi/index.ts';
import * as passkey from '@app/lib/passkey/index.ts';
import { fetchPermission } from '@app/lib/user/perm.ts';
import { createLimiter } from '@app/lib/utils/rate-limit/index.ts';
import type { App } from '@app/routes/type.ts';

const TooManyRequestsError = createError(
  'TOO_MANY_REQUESTS',
  'too many failed passkey login attempts',
  httpCodes.TOO_MANY_REQUESTS,
);

const PasskeyLoginFailedError = createError<[]>(
  'PASSKEY_LOGIN_FAILED',
  'passkey login failed',
  httpCodes.UNAUTHORIZED,
);

const PasskeyUnavailableError = createError<[]>(
  'PASSKEY_UNAVAILABLE',
  'passkey is not available',
  httpCodes.SERVICE_UNAVAILABLE,
);

function parseList(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function getRpIdConfig() {
  return {
    rpName: config.passkey.rpName,
    rpIds: parseList(config.passkey.rpIds),
    origins: parseList(config.passkey.origins),
  };
}

function currentRpId(host: string, allowlist: string[]): string {
  const normalizedHost = host.replace(/:\d+$/, '').toLowerCase();
  for (const rpId of allowlist) {
    if (
      normalizedHost === rpId.toLowerCase() ||
      normalizedHost.endsWith(`.${rpId.toLowerCase()}`)
    ) {
      return rpId;
    }
  }
  return '';
}

function currentOrigin(host: string, origins: string[], protocol: string): string {
  const normalizedHost = host.replace(/:\d+$/, '').toLowerCase();
  for (const origin of origins) {
    try {
      if (new URL(origin).hostname.toLowerCase() === normalizedHost) {
        return origin;
      }
    } catch {
      continue;
    }
  }
  // fallback: use request protocol (http in dev, https in prod)
  return `${protocol}://${host}`;
}

const passkeyLoginRateLimitWindow = 600; // 10 minutes
const passkeyLoginRateLimitMax = 10;

// eslint-disable-next-line @typescript-eslint/require-await
export async function setup(app: App) {
  const limiter = createLimiter();

  // Login options
  app.post(
    '/passkey/login/options',
    {
      schema: {
        summary: '获取 Passkey 登录选项',
        description: `
获取 WebAuthn authentication options。
不传 credentials 时（usernameless 模式），浏览器将展示系统账户选择器。`,
        operationId: 'passkeyLoginOptions',
        tags: [Tag.Misc],
        body: t.Object({
          credentials: t.Optional(
            t.Array(
              t.Object({
                credentialId: t.String(),
                transports: t.Optional(t.Array(t.String())),
              }),
            ),
          ),
        }),
        response: {
          200: t.Object({
            options: t.Any(),
            challenge: t.String(),
            rpId: t.String(),
          }),
        },
      },
    },
    async ({ body: { credentials }, headers, hostname, ip }, reply) => {
      // Rate limit: prevent flooding Redis with challenge keys
      const limitKey = `passkey-options-rate-limit-${ip}`;
      const { remain, reset, limit, limited } = await limiter.get(
        limitKey,
        passkeyLoginRateLimitWindow,
        passkeyLoginRateLimitMax,
      );
      void reply.headers({
        'X-RateLimit-Remaining': remain,
        'X-RateLimit-Limit': limit,
        'X-RateLimit-Reset': reset,
      });
      if (limited) {
        throw new TooManyRequestsError();
      }
      const cfg = getRpIdConfig();
      const rpId = currentRpId(hostname, cfg.rpIds);
      if (!rpId) {
        throw new PasskeyUnavailableError();
      }

      const { options } = await passkey.generatePasskeyAuthenticationOptions({
        rpId,
        credentials,
      });

      await passkey.createChallenge({
        challenge: options.challenge,
        uid: 0,
        type: 'login',
        rpId,
        ip,
        userAgent: headers['user-agent'] ?? '',
      });

      return {
        options,
        challenge: options.challenge,
        rpId,
      };
    },
  );

  // Login verify
  app.post(
    '/passkey/login/verify',
    {
      schema: {
        summary: '验证 Passkey 登录并签发 session',
        operationId: 'passkeyLoginVerify',
        tags: [Tag.Misc],
        body: t.Object({
          challenge: t.String({ description: '之前 options 返回的 challenge' }),
          credential: passkey.AuthenticationResponseSchema,
        }),
        response: {
          200: t.Any(),
        },
      },
    },
    async (
      { body: { challenge, credential: credentialResponse }, hostname, ip, protocol },
      reply,
    ) => {
      const cfg = getRpIdConfig();
      const rpId = currentRpId(hostname, cfg.rpIds);
      if (!rpId) {
        throw new PasskeyUnavailableError();
      }

      // Check login rate limit
      const limitKey = `passkey-login-rate-limit-${ip}`;
      const { remain, reset, limit, limited } = await limiter.get(
        limitKey,
        passkeyLoginRateLimitWindow,
        passkeyLoginRateLimitMax,
      );
      void reply.headers({
        'X-RateLimit-Remaining': remain,
        'X-RateLimit-Limit': limit,
        'X-RateLimit-Reset': reset,
      });
      if (limited) {
        throw new TooManyRequestsError();
      }

      // Consume challenge
      const consumed = await passkey.consumeChallenge(challenge, 'login', rpId);
      if (!consumed) {
        throw new PasskeyLoginFailedError();
      }

      // Find the credential by ID from the authenticator response
      const credential = await passkey.fetchCredentialByCredentialId(credentialResponse.id, rpId);
      if (!credential) {
        throw new PasskeyLoginFailedError();
      }

      const origin = currentOrigin(hostname, cfg.origins, protocol);

      let result: Awaited<ReturnType<typeof passkey.verifyPasskeyAuthentication>>;
      try {
        result = await passkey.verifyPasskeyAuthentication({
          rpId,
          origin,
          expectedChallenge: challenge,
          credential: {
            credentialId: credential.credentialId,
            publicKey: credential.publicKey,
            counter: credential.signCount,
            transports: credential.transports,
            webauthnUserId: credential.webauthnUserId,
          },
          response: credentialResponse,
        });
      } catch {
        throw new PasskeyLoginFailedError();
      }

      if (!result.verified || !result.userVerified) {
        throw new PasskeyLoginFailedError();
      }

      // Fetch the user
      const [user] = await db
        .select()
        .from(schema.chiiUsers)
        .where(op.eq(schema.chiiUsers.id, credential.uid))
        .limit(1);

      if (!user) {
        throw new PasskeyLoginFailedError();
      }

      // Check account status
      const perms = await fetchPermission(user.groupid);
      if (perms.user_ban || perms.ban_visit) {
        throw new PasskeyLoginFailedError();
      }

      // Update credential counter and last used time
      await passkey.markCredentialUsed(credential.id, result.newCounter);

      // Reset login rate limit on success
      await limiter.reset(limitKey);

      // Create session
      const token = await session.create({
        id: user.id,
        regTime: user.regdate,
      });

      void reply.cookie(CookieKey, token, { maxAge: 24 * 60 * 60 * 30 });

      return {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        avatar: avatar(user.avatar),
        sign: user.sign,
        group: user.groupid,
        joinedAt: user.regdate,
      };
    },
  );
}
