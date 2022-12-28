import dayjs from 'dayjs';
import * as typeorm from 'typeorm';

import { SessionRepo } from '@app/lib/orm';
import { randomBase62String } from '@app/lib/utils';

import * as auth from './index';
import type { IAuth } from './index';

export async function create(user: { id: number; regTime: number }): Promise<string> {
  const now = dayjs().unix();
  const token = await randomBase62String(32);
  const value = {
    reg_time: dayjs().toISOString(),
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

/**
 * TODO: add cache
 *
 * @param sessionID - Store in user cookies
 */
export async function get(sessionID: string): Promise<IAuth | null> {
  const session = await SessionRepo.findOne({
    where: { key: sessionID, expiredAt: typeorm.MoreThanOrEqual(dayjs().unix()) },
  });
  if (!session) {
    return null;
  }

  return await auth.byUserID(session.userID);
}

export async function revoke(sessionID: string) {
  await SessionRepo.update({ key: sessionID }, { expiredAt: dayjs().unix() - 60 * 60 });
}
