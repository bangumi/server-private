import * as crypto from 'node:crypto';

import { createError } from '@fastify/error';
import { compare } from '@node-rs/bcrypt';

import { db, op, schema } from '@app/drizzle';
import { TypedCache } from '@app/lib/cache.ts';
import { parseScopeColumn, type TokenScope } from '@app/lib/scope.ts';
import type * as res from '@app/lib/types/res.ts';
import { fetchPermission, type Permission } from '@app/lib/user/perm';
import {
  canViewNsfwSubject,
  fetchPrivacyByUserID,
  isNsfwSubjectPreferenceEnabled,
} from '@app/lib/user/privacy.ts';
import { fetchUserX } from '@app/lib/user/utils.ts';
import { intval } from '@app/lib/utils/index.ts';
import { getTimelineSourceFromAppID } from '@app/vendor';

const tokenPrefix = 'Bearer ';
const defaultSource = 6; // next

export const NeedLoginError = createError<[string]>(
  'NEED_LOGIN',
  'you need to login before %s',
  401,
);

export const HeaderInvalidError = createError<[string]>('AUTHORIZATION_INVALID', '%s', 401);

const TokenNotValidError = createError<[]>(
  'TOKEN_INVALID',
  "can't find access token or it has been expired",
  401,
);

export const NotAllowedError = createError<[string]>(
  'NOT_ALLOWED',
  `you don't have permission to %s`,
  403,
);

export const UserGroup = Object.freeze({
  Unknown: 0,
  Admin: 1,
  BangumiAdmin: 2,
  WindowAdmin: 3,
  Quite: 4,
  Banned: 5,
  // 不太清楚具体是什么
  _6: 6,
  // 不太清楚具体是什么
  _7: 7,
  CharacterAdmin: 8,
  WikiAdmin: 9,
  Normal: 10,
  WikiEditor: 11,
} as const);

export interface IAuth {
  userID: number;
  login: boolean;
  allowNsfw: boolean;
  permission: Readonly<Permission>;
  /** Unix time seconds */
  regTime: number;
  groupID: number;
  source: number;
  /** Access token 被授予的 scope，`null` 表示凭据不受 scope 限制 */
  scope: TokenScope;
}

export async function byHeader(key: string | string[] | undefined): Promise<IAuth | null> {
  if (!key) {
    return emptyAuth();
  }

  if (Array.isArray(key)) {
    throw new HeaderInvalidError("can't providing multiple access token");
  }

  if (!key.startsWith(tokenPrefix)) {
    throw new HeaderInvalidError('authorization header should have "Bearer ${TOKEN}" format');
  }

  const token = key.slice(tokenPrefix.length);
  if (!token) {
    throw new HeaderInvalidError('authorization header missing token');
  }

  return await byToken(token);
}

interface CachedTokenAuth {
  userID: number;
  appID: string;
  scope: TokenScope;
  expiredAt: number;
}

const tokenAuthCache = TypedCache<string, CachedTokenAuth>((token) => `auth:v5:token:${token}`);

export async function invalidateTokenCache(accessToken: string): Promise<void> {
  await tokenAuthCache.del(accessToken);
}

export async function byToken(accessToken: string): Promise<IAuth | null> {
  const cached = await tokenAuthCache.get(accessToken);
  if (cached && cached.expiredAt > Date.now()) {
    return await userToAuth(await getAuthUser(cached.userID), cached.appID, cached.scope);
  }

  const token = await db.query.chiiAccessToken.findFirst({
    where: op.and(
      op.sql`access_token = ${accessToken} collate utf8mb4_bin`,
      op.gt(schema.chiiAccessToken.expiredAt, new Date()),
    ),
  });

  if (!token) {
    throw new TokenNotValidError();
  }

  if (!token.userID) {
    throw new Error('access token without user id');
  }

  const u = await fetchUserX(intval(token.userID));
  const scope = parseScopeColumn(token.scope);

  await tokenAuthCache.set(
    accessToken,
    {
      userID: u.id,
      appID: token.clientID,
      scope,
      expiredAt: token.expiredAt.getTime(),
    },
    60 * 60 * 24,
  );

  return await userToAuth(u, token.clientID, scope);
}

const passwordCache = TypedCache<number, string>((userID) => `auth:password:${userID}`);

export async function fetchPasswordCrypt(userID: number): Promise<string | null> {
  return await passwordCache.cached(userID, async () => {
    const [u] = await db
      .select({ password: schema.chiiUsers.passwordCrypt })
      .from(schema.chiiUsers)
      .where(op.eq(schema.chiiUsers.id, userID))
      .limit(1);

    return u?.password ?? null;
  });
}

export async function invalidatePasswordCache(userID: number): Promise<void> {
  await passwordCache.del(userID);
}

const userCache = TypedCache<number, res.ISlimUser>((userID) => `auth:v2:user:${userID}`);

async function getAuthUser(userID: number): Promise<res.ISlimUser> {
  const cached = await userCache.get(userID);
  if (cached) {
    return cached;
  }

  const user = await fetchUserX(userID);

  await userCache.set(userID, user, 60 * 60);

  return user;
}

export async function invalidateUserCache(userID: number): Promise<void> {
  await userCache.del(userID);
}

export async function byUserID(userID: number): Promise<IAuth> {
  return await userToAuth(await getAuthUser(userID));
}

export function emptyAuth(): IAuth {
  return {
    userID: 0,
    login: false,
    permission: {},
    allowNsfw: false,
    regTime: 0,
    groupID: 0,
    source: defaultSource,
    scope: null,
  };
}

async function userToAuth(
  user: res.ISlimUser,
  appID = '',
  scope: TokenScope = null,
): Promise<IAuth> {
  const perms = await fetchPermission(user.group);
  const privacy = await fetchPrivacyByUserID(user.id);
  const showNsfwSubject = isNsfwSubjectPreferenceEnabled(privacy);
  return {
    userID: user.id,
    login: true,
    permission: perms,
    allowNsfw: canViewNsfwSubject({
      showNsfwSubject,
      userID: user.id,
      regTime: user.joinedAt,
      permission: perms,
    }),
    regTime: user.joinedAt,
    groupID: user.group,
    source: getTimelineSourceFromAppID(appID) ?? defaultSource,
    scope,
  };
}

function processPassword(s: string): string {
  return crypto.createHash('md5').update(s).digest('hex');
}

export async function comparePassword(hashed: string, input: string): Promise<boolean> {
  return compare(processPassword(input), hashed);
}
