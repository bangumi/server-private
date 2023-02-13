/* eslint-disable @typescript-eslint/require-await */
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { IAuth } from '@app/lib/auth';
import { emptyAuth, NeedLoginError, NotAllowedError } from '@app/lib/auth';
import * as auth from '@app/lib/auth';
import * as authCode from '@app/lib/auth/authcode';
import * as session from '@app/lib/auth/session';
import { CookieKey, LegacyCookieKey } from '@app/lib/auth/session';
import config from '@app/lib/config';
import { UserRepo } from '@app/lib/orm';
import { cached } from '@app/lib/redis';
import { md5 } from '@app/lib/utils';

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

  if (!/\d+/.test(userIDRaw)) {
    return false;
  }

  const userID = Number(userIDRaw);
  const user = await cached<{ password: string }>({
    key: `user-pw-${userIDRaw}`,
    getter: async () => {
      const u = await UserRepo.findOneBy({ id: userID });
      if (u) {
        return { password: u.passwordCrypt };
      }
    },
    ttl: 60,
  });

  if (!user) {
    return false;
  }

  if (user.password === passwordCrypt) {
    req.auth = await auth.byUserID(userID);
    return true;
  }

  return false;
}

export async function SessionAuth(req: FastifyRequest, res: FastifyReply) {
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
}

export async function redirectIfNotLogin(req: FastifyRequest, reply: FastifyReply) {
  if (!req.auth.login) {
    const qs = new URLSearchParams({ to: req.url });
    return reply.redirect(`/demo/login?${qs.toString()}`);
  }
}
