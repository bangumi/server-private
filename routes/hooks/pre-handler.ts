/* eslint-disable @typescript-eslint/require-await */
import type { FastifyReply, FastifyRequest } from 'fastify';

import * as authCode from '@app/lib/auth/authcode.ts';
import type { IAuth } from '@app/lib/auth/index.ts';
import { emptyAuth, NeedLoginError, NotAllowedError } from '@app/lib/auth/index.ts';
import * as auth from '@app/lib/auth/index.ts';
import * as session from '@app/lib/auth/session.ts';
import { CookieKey, LegacyCookieKey } from '@app/lib/auth/session.ts';
import { TypedCache } from '@app/lib/cache.ts';
import config from '@app/lib/config.ts';
import { UserRepo } from '@app/lib/orm/index.ts';
import { md5 } from '@app/lib/utils/index.ts';

export const requireLogin = (s: string) => async (req: { auth: IAuth }) => {
  if (!req.auth.login) {
    throw new NeedLoginError(s);
  }
};

export function requirePermission(s: string, allowed: (auth: IAuth) => boolean | undefined) {
  return async ({ auth }: { auth: IAuth }) => {
    if (!allowed(auth)) {
      throw new NotAllowedError(s);
    }
  };
}

const legacySessionCache = TypedCache<number, { password: string }>(
  (id) => `auth:legacy-session:${id}`,
);

async function legacySessionAuth(req: FastifyRequest): Promise<boolean> {
  const ua = req.headers['user-agent'];
  if (!ua) {
    return false;
  }

  const sessionRaw = req.cookies[LegacyCookieKey];
  if (!sessionRaw) {
    return false;
  }

  const s = authCode.decode(sessionRaw, md5(config.php_session_secret_key + ua));

  const [passwordCrypt, userIDRaw] = s.split('\t');
  if (!userIDRaw || !passwordCrypt) {
    return false;
  }

  const userID = Number(userIDRaw);
  if (Number.isNaN(userID) || !Number.isSafeInteger(userID)) {
    return false;
  }

  const user = await legacySessionCache.cached(userID, async () => {
    const u = await UserRepo.findOneBy({ id: userID });
    if (u) {
      return { password: u.passwordCrypt };
    }

    return null;
  });

  if (!user) {
    return false;
  }

  if (user.password === passwordCrypt) {
    req.auth = await auth.byUserID(userID);
    req.requestContext.set('user', req.auth.userID);
    return true;
  }

  return false;
}

export async function sessionAuth(req: FastifyRequest, res: FastifyReply) {
  if (await legacySessionAuth(req)) {
    return;
  }

  const newSessionValue = req.cookies[session.CookieKey];

  if (!newSessionValue) {
    req.auth = emptyAuth();
    return;
  }

  const a = await session.get(newSessionValue);
  if (!a) {
    void res.clearCookie(CookieKey);
    req.auth = emptyAuth();
    return;
  }

  req.auth = a;
  req.requestContext.set('user', a.userID);
}

export async function Auth(req: FastifyRequest, res: FastifyReply) {
  if (await accessTokenAuth(req)) {
    return;
  }
  await sessionAuth(req, res);
}

export async function accessTokenAuth(req: FastifyRequest): Promise<boolean> {
  const token = req.headers.authorization;
  if (!token) {
    return false;
  }
  const a = await auth.byHeader(token);
  if (a) {
    req.auth = a;
    req.requestContext.set('user', a.userID);
    return true;
  }
  return false;
}

export async function redirectIfNotLogin(req: FastifyRequest, reply: FastifyReply) {
  if (!req.auth.login) {
    const qs = new URLSearchParams({ backTo: req.url });
    return reply.redirect(`/demo/login?${qs.toString()}`);
  }
}
