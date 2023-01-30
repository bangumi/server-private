/* eslint-disable @typescript-eslint/require-await */
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { IAuth } from '@app/lib/auth';
import { emptyAuth, NeedLoginError, NotAllowedError } from '@app/lib/auth';
import * as session from '@app/lib/auth/session';
import { CookieKey } from '@app/lib/rest/private/routes/login';

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

export async function SessionAuth(req: FastifyRequest, res: FastifyReply) {
  if (!req.cookies.chiiNextSessionID) {
    req.auth = emptyAuth();
    return;
  }

  const a = await session.get(req.cookies.chiiNextSessionID);
  if (!a) {
    void res.clearCookie(CookieKey);
    req.auth = emptyAuth();
    return;
  }

  req.auth = a;
}
