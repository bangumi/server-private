import type { CookieSerializeOptions } from '@fastify/cookie';
import { DateTime } from 'luxon';
import t from 'typebox';
import { Value } from 'typebox/value';

import { db, op, schema } from '@app/drizzle';
import { TypedCache } from '@app/lib/cache.ts';
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

const SessionValueSchema = t.Object({
  password: t.String({ minLength: 1 }),
});

export async function create(user: {
  id: number;
  regTime: number;
  password: string;
}): Promise<string> {
  const now = DateTime.now().toUnixInteger();
  const bytes = await randomBytes(30);
  const token = bytes.toString('base64url');

  const value = {
    reg_time: DateTime.now().toISOTime(),
    user_id: user.id,
    created_at: now,
    expired_at: now + 60 * 60 * 24 * 7,
    password: user.password,
  };

  await db.insert(schema.chiiOsWebSessions).values({
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
  /** Password_crypt at the time this session was loaded */
  password: string;
}

const sessionCache = TypedCache<string, ICachedSession>((sessionID) => `auth:session:${sessionID}`);

/** @param sessionID - Store in user cookies */
export async function get(sessionID: string): Promise<IAuth | null> {
  const cached = await sessionCache.get(sessionID);
  if (cached) {
    return await authByPassword(cached.userID, cached.password);
  }

  const session = await db.query.chiiOsWebSessions.findFirst({
    where: op.and(
      op.sql`\`key\` = ${sessionID} collate utf8mb4_bin`,
      op.gt(schema.chiiOsWebSessions.expiredAt, DateTime.now().toUnixInteger()),
    ),
  });
  if (!session) {
    return null;
  }

  const password = sessionPassword(session.value);
  if (!password) {
    return null;
  }

  await sessionCache.set(sessionID, { userID: session.userID, password });

  return await authByPassword(session.userID, password);
}

function sessionPassword(value: Buffer): string | null {
  try {
    return Value.Parse(SessionValueSchema, JSON.parse(value.toString())).password;
  } catch {
    // sessions created before password binding can't be verified, treat them as logged out
    return null;
  }
}

async function authByPassword(userID: number, password: string): Promise<IAuth | null> {
  if ((await auth.fetchPasswordCrypt(userID)) !== password) {
    return null;
  }

  return await auth.byUserID(userID);
}

export async function revoke(sessionID: string) {
  await db
    .update(schema.chiiOsWebSessions)
    .set({ expiredAt: DateTime.now().toUnixInteger() })
    .where(op.eq(schema.chiiOsWebSessions.key, sessionID));

  await sessionCache.del(sessionID);
}
