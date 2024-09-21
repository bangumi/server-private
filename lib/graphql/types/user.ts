import { extendType, objectType } from 'nexus';

import { imageDomain } from '@app/lib/config.ts';
import type { Context } from '@app/lib/graphql/context.ts';
import type * as entity from '@app/lib/orm/entity/index.ts';
import type { IUser } from '@app/lib/orm/index.ts';
import { fetchUser } from '@app/lib/orm/index.ts';
import { avatar } from '@app/lib/response.ts';
import type * as res from '@app/lib/types/res.ts';

const Avatar = objectType({
  name: 'Avatar',
  definition(t) {
    t.nonNull.string('large');
    t.nonNull.string('medium');
    t.nonNull.string('small');
  },
});

const User = objectType({
  name: 'User',
  definition(t) {
    t.nonNull.int('id');
    t.nonNull.string('username');
    t.nonNull.string('nickname');
    t.nonNull.field('avatar', {
      type: Avatar,
      resolve(parent: IUser) {
        const img = parent.img || 'icon.jpg';

        return {
          large: `https://${imageDomain}/pic/user/l/${img}`,
          medium: `https://${imageDomain}/pic/user/m/${img}`,
          small: `https://${imageDomain}/pic/user/s/${img}`,
        };
      },
    });
  },
});

export function convertUser(user: entity.User) {
  return {
    id: user.id,
    username: user.username,
    nickname: user.nickname,
    avatar: avatar(user.avatar),
  };
}

const GetCurrentUser = extendType({
  type: 'Query',
  definition(t) {
    t.nullable.field('me', {
      type: User,
      async resolve(
        _parent,
        _args,
        { auth }: Context,
      ): Promise<{ id: number; username: string; avatar: res.IAvatar; nickname: string } | null> {
        if (!auth.userID) {
          return null;
        }

        const user = await fetchUser(auth.userID);
        if (!user) {
          return null;
        }

        return {
          id: user.id,
          avatar: avatar(user.img),
          nickname: user.nickname,
          username: user.username,
        };
      },
    });
  },
});

export default [User, GetCurrentUser];
