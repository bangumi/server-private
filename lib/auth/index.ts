import * as crypto from 'node:crypto';

import { createError } from '@fastify/error';
import { compare } from '@node-rs/bcrypt';

import { db, op, schema } from '@app/drizzle';
import { TypedCache } from '@app/lib/cache.ts';
import { fetchUserPermission, type Permission } from '@app/lib/user/perm';
import {
  canViewNsfwSubject,
  fetchPrivacyByUserID,
  isNsfwSubjectPreferenceEnabled,
} from '@app/lib/user/privacy.ts';
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

interface AuthUser {
  id: number;
  joinedAt: number;
  group: number;
  acl: string;
}

type CachedAuthUser = Omit<AuthUser, 'acl'> & { acl?: string };

const tokenAuthCache = TypedCache<string, { user: CachedAuthUser; appID: string }>(
  (token) => `auth:v3:token:${token}`,
);
const userCache = TypedCache<number, CachedAuthUser>((userID) => `auth:v2:user:${userID}`);

export async function invalidateTokenCache(accessToken: string): Promise<void> {
  await tokenAuthCache.del(accessToken);
}

export async function byToken(accessToken: string): Promise<IAuth | null> {
  const cached = await tokenAuthCache.get(accessToken);
  if (cached && cached.user.acl !== undefined) {
    return await userToAuth({ ...cached.user, acl: cached.user.acl }, cached.appID);
  }

  const token = await db.query.chiiAccessToken.findFirst({
    columns: { userID: true, clientID: true },
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

  const user = await fetchAuthUser(intval(token.userID));
  await tokenAuthCache.set(accessToken, { user, appID: token.clientID }, 60 * 60 * 24);
  return await userToAuth(user, token.clientID);
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

export async function byUserID(userID: number): Promise<IAuth> {
  const cached = await userCache.get(userID);
  if (cached && cached.acl !== undefined) {
    return await userToAuth({ ...cached, acl: cached.acl });
  }

  const user = await fetchAuthUser(userID);
  await userCache.set(userID, user, 60 * 60);
  return await userToAuth(user);
}

async function fetchAuthUser(userID: number): Promise<AuthUser> {
  const user = await db.query.chiiUsers.findFirst({
    columns: { id: true, regdate: true, groupid: true, acl: true },
    where: op.eq(schema.chiiUsers.id, userID),
  });
  if (!user) {
    throw new TokenNotValidError();
  }
  return { id: user.id, group: user.groupid, joinedAt: user.regdate, acl: user.acl };
}

async function userToAuth(user: AuthUser, appID = ''): Promise<IAuth> {
  const userID = user.id;
  const permission = await fetchUserPermission({ groupid: user.group, acl: user.acl });

  const privacy = await fetchPrivacyByUserID(userID);
  return {
    userID,
    login: true,
    permission,
    allowNsfw: canViewNsfwSubject({
      showNsfwSubject: isNsfwSubjectPreferenceEnabled(privacy),
      userID,
      regTime: user.joinedAt,
      permission,
    }),
    regTime: user.joinedAt,
    groupID: user.group,
    source: getTimelineSourceFromAppID(appID) ?? defaultSource,
  };
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
  };
}

function processPassword(s: string): string {
  return crypto.createHash('md5').update(s).digest('hex');
}

export async function comparePassword(hashed: string, input: string): Promise<boolean> {
  return compare(processPassword(input), hashed);
}
