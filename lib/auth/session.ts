import { DateTime } from 'luxon';

import { redisPrefix } from '@app/lib/config';
import { SessionRepo } from '@app/lib/orm';
import redis from '@app/lib/redis';
import { randomBytes } from '@app/lib/utils';

import type { IAuth } from './index';
import * as auth from './index';

export const CookieKey = 'chiiNextSessionID';
export const LegacyCookieKey = 'chii_auth';

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

/** @param sessionID - Store in user cookies */
export async function get(sessionID: string): Promise<IAuth | null> {
  const key = `${redisPrefix}-auth-session-${sessionID}`;
  const cached = await redis.get(key);
  if (cached) {
    const session = JSON.parse(cached) as ICachedSession;

    return await auth.byUserID(session.userID);
  }

  const session = await SessionRepo.findOneBy({ key: sessionID });
  if (!session) {
    return null;
  }
  if (session.expiredAt <= DateTime.now().toUnixInteger()) {
    return null;
  }

  await redis.set(
    key,
    JSON.stringify({ userID: session.userID } satisfies ICachedSession),
    'EX',
    60,
  );

  return await auth.byUserID(session.userID);
}

export async function revoke(sessionID: string) {
  const key = `${redisPrefix}-auth-session-${sessionID}`;
  await redis.del(key);

  await SessionRepo.update(
    { key: sessionID },
    { expiredAt: DateTime.now().toUnixInteger() - 60 * 60 },
  );
}
