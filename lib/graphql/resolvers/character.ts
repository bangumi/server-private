import type { Wiki } from '@bgm38/wiki';
import { parse as parseWiki, WikiSyntaxError } from '@bgm38/wiki';

import type * as entity from '@app/lib/orm/entity/index.ts';
import { personImages } from '@app/lib/response.ts';

export function convertCharacter(character: entity.Character) {
  let wiki: Wiki = {
    type: '',
    data: [],
  };
  try {
    wiki = parseWiki(character.infobox);
  } catch (error) {
    if (!(error instanceof WikiSyntaxError)) {
      throw error;
    }
  }
  const infobox = wiki.data.map((item) => {
    if (item.array) {
      return item;
    }
    return {
      key: item.key,
      values: [
        {
          v: item.value,
        },
      ],
    };
  });
  return {
    id: character.id,
    name: character.name,
    role: character.role,
    infobox,
    summary: character.summary,
    images: personImages(character.img),
    comment: character.comment,
    collects: character.collects,
    last_post: character.lastPost,
    lock: character.lock,
    redirect: character.redirect,
    nsfw: character.nsfw,
  };
}
