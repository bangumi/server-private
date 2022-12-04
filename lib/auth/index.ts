import { createError } from '@fastify/error';

import prisma from '../prisma';
import type { Permission } from './permission';
import { getPermission } from './permission';

export interface IUser {
  ID: number;
  username: string;
  nickname: string;
  img: string;
}

export interface IAuth {
  login: boolean;
  allowNsfw: boolean;
  permission: Permission;
  user: null | IUser;
}

const TokenNotValidError = createError('TOKEN_INVALID', "can't find user by access token", 401);

export async function byToken(access_token: string | undefined): Promise<IAuth> {
  if (!access_token) {
    return {
      user: null,
      login: false,
      permission: {},
      allowNsfw: false,
    };
  }
  const token = await prisma.chii_oauth_access_tokens.findFirst({
    where: { access_token, expires: { gte: new Date() } },
  });

  if (!token) {
    throw new TokenNotValidError();
  }

  const user = await prisma.chii_members.findFirst({
    where: { uid: parseInt(token.user_id!) },
  });

  if (!user) {
    throw new Error(
      'missing user, please report a issue at https://github.com/bangumi/GraphQL/issues',
    );
  }

  return {
    user: {
      ID: user.uid,
      nickname: user.nickname,
      username: user.username,
      img: user.avatar,
    },
    login: true,
    permission: await getPermission(user.groupid),
    allowNsfw: user.regdate - Date.now() / 1000 <= 60 * 60 * 24 * 90,
  };
}
