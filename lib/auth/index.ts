import * as crypto from 'node:crypto';

import { createError } from '@fastify/error';
import { compare } from '@node-rs/bcrypt';
import { DateTime } from 'luxon';
import { FindOperator } from 'typeorm';

import { redisPrefix } from '@app/lib/config';
import type { SingleMessageErrorConstructor } from '@app/lib/error';
import type { IUser, Permission } from '@app/lib/orm';
import { AccessTokenRepo, fetchPermission, fetchUser } from '@app/lib/orm';
import redis from '@app/lib/redis';
import NodeCache from '@app/vendor/node-cache';

const tokenPrefix = 'Bearer ';
export const NeedLoginError: SingleMessageErrorConstructor = createError(
  'NEED_LOGIN',
  'you need to login before %s',
  401,
);
export const NotAllowedError: SingleMessageErrorConstructor = createError(
  'NOT_ALLOWED',
  `you don't have permission to %s`,
  401,
);
const HeaderInvalidError: SingleMessageErrorConstructor = createError(
  'AUTHORIZATION_INVALID',
  '%s',
  401,
);
const TokenNotValidError = createError(
  'TOKEN_INVALID',
  "can't find access token or it has been expired",
  401,
);
const MissingUserError = createError('MISSING_USER', "can't find user", 500);

export const enum UserGroup {
  Unknown = 0,
  Admin = 1,
  BangumiAdmin,
  WindowAdmin,
  Quite,
  Banned,
  // 不太清除具体是什么
  _6,
  // 不太清除具体是什么
  _7,
  CharacterAdmin,
  WikiAdmin,
  Normal,
  WikiEditor,
}

export interface IAuth {
  userID: number;
  login: boolean;
  allowNsfw: boolean;
  permission: Readonly<Permission>;
  /** Unix time seconds */
  regTime: number;
  groupID: UserGroup;
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

export async function byToken(accessToken: string): Promise<IAuth | null> {
  const key = `${redisPrefix}-auth-access-token-${accessToken}`;
  const cached = await redis.get(key);
  if (cached) {
    const user = JSON.parse(cached) as IUser;
    return await userToAuth(user);
  }

  const token = await AccessTokenRepo.findOne({
    where: { accessToken, expires: new FindOperator<Date>('moreThanOrEqual', new Date()) },
  });

  if (!token) {
    throw new TokenNotValidError();
  }

  if (!token.userId) {
    throw new Error('access token without user id');
  }

  const u = await fetchUser(Number.parseInt(token.userId));
  if (!u) {
    throw new MissingUserError();
  }

  await redis.set(key, JSON.stringify(u), 'EX', 60 * 60 * 24);

  return await userToAuth(u);
}

export async function byUserID(userID: number): Promise<IAuth> {
  const key = `${redisPrefix}-auth-user-id-${userID}`;
  const cached = await redis.get(key);
  if (cached) {
    return await userToAuth(JSON.parse(cached) as IUser);
  }

  const u = await fetchUser(userID);
  if (!u) {
    throw new MissingUserError();
  }

  await redis.set(key, JSON.stringify(u), 'EX', 60 * 60);

  return await userToAuth(u);
}

const permissionCache = new NodeCache({ stdTTL: 60 * 10 });

async function getPermission(userGroup?: number): Promise<Readonly<Permission>> {
  if (!userGroup) {
    return {};
  }

  const cached = permissionCache.get(userGroup);
  if (cached) {
    return cached;
  }

  const p = await fetchPermission(userGroup);

  permissionCache.set(userGroup, p);

  return p;
}

export function emptyAuth(): IAuth {
  return {
    userID: 0,
    login: false,
    permission: {},
    allowNsfw: false,
    regTime: 0,
    groupID: 0,
  };
}

async function userToAuth(user: IUser): Promise<IAuth> {
  return {
    userID: user.id,
    login: true,
    permission: await getPermission(user.groupID),
    allowNsfw: user.regTime - DateTime.now().toUnixInteger() <= 60 * 60 * 24 * 90,
    regTime: user.regTime,
    groupID: user.groupID,
  };
}

function processPassword(s: string): string {
  return crypto.createHash('md5').update(s).digest('hex');
}

export async function comparePassword(hashed: string, input: string): Promise<boolean> {
  return compare(processPassword(input), hashed);
}
