import prisma from '../prisma';
import { randomBase62String } from '../utils';
import * as auth from './index';
import type { IAuth } from './index';

export async function create(user: { id: number; regTime: number }): Promise<string> {
  const now = Math.trunc(Date.now() / 1000);
  const token = randomBase62String(32);
  const value = {
    reg_time: new Date(user.regTime * 1000).toISOString(),
    user_id: user.id,
    created_at: now,
    expired_at: now + 60 * 60 * 24 * 7,
  };

  await prisma.chii_os_web_sessions.create({
    data: {
      value: Buffer.from(JSON.stringify(value)),
      user_id: user.id,
      created_at: value.created_at,
      expired_at: value.expired_at,
      key: token,
    },
  });

  return token;
}

/**
 * TODO: add cache
 * @param sessionID store in user cookies
 */
export async function get(sessionID: string): Promise<IAuth | null> {
  const session = await prisma.chii_os_web_sessions.findFirst({
    where: { key: sessionID, expired_at: { gte: Math.trunc(Date.now() / 1000) } },
  });
  if (!session) {
    return null;
  }

  return await auth.byUserID(session.user_id);
}

export async function revoke(sessionID: string) {
  await Promise.all([
    prisma.chii_os_web_sessions.update({
      where: {
        key: sessionID,
      },
      data: {
        expired_at: Math.trunc(Date.now() / 1000) - 60 * 60,
      },
    }),
  ]);
}
