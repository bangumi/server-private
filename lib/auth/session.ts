import { DateTime } from 'luxon';
import * as typeorm from 'typeorm';

import { redisPrefix } from '@app/lib/config';
import { SessionRepo } from '@app/lib/orm';
import redis from '@app/lib/redis';
import { randomBase62String } from '@app/lib/utils';

import type { IAuth } from './';
import * as auth from './';

export const CookieKey = 'chiiNextSessionID';

export async function create(user: { id: number; regTime: number }): Promise<string> {
  const now = DateTime.now().toUnixInteger();
  const token = await randomBase62String(32);
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

  const session = await SessionRepo.findOne({
    where: { key: sessionID, expiredAt: typeorm.MoreThanOrEqual(DateTime.now().toUnixInteger()) },
  });
  if (!session) {
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
