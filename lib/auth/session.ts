import type { CookieSerializeOptions } from '@fastify/cookie';
import { DateTime } from 'luxon';

import { TypedCache } from '@app/lib/cache.ts';
import { SessionRepo } from '@app/lib/orm/index.ts';
import { randomBytes } from '@app/lib/utils/index.ts';

import type { IAuth } from './index.ts';
import * as auth from './index.ts';

export const CookieKey = 'chiiNextSessionID';
export const LegacyCookieKey = 'chii_auth';
export const cookiesPluginOption: Readonly<CookieSerializeOptions> = {
  sameSite: 'lax',
  secure: 'auto',
  path: '/',
  httpOnly: true,
};

export async function create(user: { id: number; regTime: number }): Promise<string> {
  const now = DateTime.now().toUnixInteger();
  const bytes = await randomBytes(30);
  const token = bytes.toString('base64url');

  const value = {
    reg_time: DateTime.now().toISOTime(),
    user_id: user.id,
    created_at: now,
    expired_at: now + 60 * 60 * 24 * 7,
  };

  await SessionRepo.insert({
    value: Buffer.from(JSON.stringify(value)),
    userID: user.id,
    createdAt: value.created_at,
    expiredAt: value.expired_at,
    key: token,
  });

  return token;
}

interface ICachedSession {
  userID: number;
}

const sessionCache = TypedCache<string, ICachedSession>((sessionID) => `auth:session:${sessionID}`);

/** @param sessionID - Store in user cookies */
export async function get(sessionID: string): Promise<IAuth | null> {
  const cached = await sessionCache.get(sessionID);
  if (cached) {
    return await auth.byUserID(cached.userID);
  }

  const session = await SessionRepo.findOneBy({ key: sessionID });
  if (!session) {
    return null;
  }
  if (session.expiredAt <= DateTime.now().toUnixInteger()) {
    return null;
  }

  await sessionCache.set(sessionID, { userID: session.userID });

  return await auth.byUserID(session.userID);
}

export async function revoke(sessionID: string) {
  await SessionRepo.update({ key: sessionID }, { expiredAt: DateTime.now().toUnixInteger() });

  await sessionCache.del(sessionID);
}
