import { objectType, extendType } from 'nexus';

import { fetchUser } from '../../orm';
import type { IUser } from '../../orm';
import { avatar } from '../../response';
import type * as res from '../../types/res';
import type { Context } from '../context';

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
          large: 'https://lain.bgm.tv/pic/user/l/' + img,
          medium: 'https://lain.bgm.tv/pic/user/m/' + img,
          small: 'https://lain.bgm.tv/pic/user/s/' + img,
        };
      },
    });
  },
});

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
