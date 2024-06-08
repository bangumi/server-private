import type { Wiki } from '@bgm38/wiki';
import { parse as parseWiki, WikiSyntaxError } from '@bgm38/wiki';
import { extendType, intArg, nonNull, objectType } from 'nexus';

import type { Context } from '@app/lib/graphql/context.ts';
import type * as entity from '@app/lib/orm/entity/index.ts';
import { CharacterRepo } from '@app/lib/orm/index.ts';
import { personImages } from '@app/lib/response.ts';

import { Images, InfoboxItem } from './common.ts';

const Character = objectType({
  name: 'Character',
  definition(t) {
    t.nonNull.int('id');
    t.nonNull.string('name');
    t.nonNull.int('role');
    t.list.nonNull.field('infobox', { type: InfoboxItem });
    t.nonNull.string('summary');
    t.nullable.field('images', { type: Images });
    t.nonNull.int('comment');
    t.nonNull.int('collects');
    t.nonNull.int('lastpost');
    t.nonNull.int('lock');
    t.nonNull.int('ban');
    t.nonNull.int('redirect');
    t.nonNull.boolean('nsfw');
  },
});

function convertCharacter(character: entity.Character) {
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
    ban: character.ban,
    redirect: character.redirect,
    nsfw: character.nsfw,
  };
}

const CharacterByIDQuery = extendType({
  type: 'Query',
  definition(t) {
    t.nonNull.field('character', {
      type: 'Character',
      args: { id: nonNull(intArg()) },
      async resolve(_parent, { id }: { id: number }, { auth: { allowNsfw } }: Context) {
        let query = CharacterRepo.createQueryBuilder('c').where('c.id = :id', { id });
        if (!allowNsfw) {
          query = query.andWhere('c.nsfw = :allowNsfw', { allowNsfw });
        }
        const character = await query.getOne();
        if (!character) {
          return null;
        }
        return convertCharacter(character);
      },
    });
  },
});

export default [Character, CharacterByIDQuery];
