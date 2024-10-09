import type { WikiMap } from '@bgm38/wiki';
import { parseToMap as parseWiki, WikiSyntaxError } from '@bgm38/wiki';

import type * as orm from '@app/lib/orm/index.ts';
import { avatar } from '@app/lib/response.ts';
import type * as res from '@app/lib/types/res.ts';

export function toInfobox(content: string): res.IInfobox {
  let wiki: WikiMap = {
    type: '',
    data: new Map(),
  };
  try {
    wiki = parseWiki(content);
  } catch (error) {
    if (!(error instanceof WikiSyntaxError)) {
      throw error;
    }
  }
  const infobox: res.IInfobox = {};
  for (const [key, item] of wiki.data) {
    switch (typeof item) {
      case 'string': {
        infobox[key] = [
          {
            v: item,
          },
        ];
        break;
      }
      case 'object': {
        infobox[key] = item.map((v) => {
          return {
            k: v.k,
            v: v.v || '',
          };
        });
        break;
      }
    }
  }
  return infobox;
}

export function toUser(user: orm.IUser): res.IUser {
  return {
    avatar: avatar(user.img),
    username: user.username,
    nickname: user.nickname,
    id: user.id,
    sign: user.sign,
    user_group: user.groupID,
  };
}
