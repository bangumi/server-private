import type { Wiki } from '@bgm38/wiki';
import { parse as parseWiki, WikiSyntaxError } from '@bgm38/wiki';
import { extendType, intArg, nonNull, objectType } from 'nexus';

import type { Context } from '@app/lib/graphql/context.ts';
import * as entity from '@app/lib/orm/entity/index.ts';
import { CharacterRepo, CharacterSubjectsRepo } from '@app/lib/orm/index.ts';
import { personImages } from '@app/lib/response.ts';

import { Images, InfoboxItem } from './common.ts';
import { convertSubject } from './subject.ts';

const CharacterRelatedSubject = objectType({
  name: 'CharacterRelatedSubject',
  definition(t) {
    t.nonNull.field('subject', {
      type: 'Subject',
    });
    t.nonNull.int('type');
    t.nonNull.int('order');
  },
});

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
    t.nonNull.int('last_post');
    t.nonNull.int('lock');
    t.nonNull.int('redirect');
    t.nonNull.boolean('nsfw');
    t.list.nonNull.field('subjects', {
      type: CharacterRelatedSubject,
      args: {
        limit: nonNull(intArg({ default: 10 })),
        offset: nonNull(intArg({ default: 0 })),
      },
      async resolve(
        parent: { id: number },
        { limit, offset }: { limit: number; offset: number },
        { auth: { allowNsfw } }: Context,
      ) {
        let query = CharacterSubjectsRepo.createQueryBuilder('r')
          .innerJoinAndMapOne('r.subject', entity.Subject, 's', 's.id = r.subjectID')
          .innerJoinAndMapOne('s.fields', entity.SubjectFields, 'f', 'f.subjectID = s.id')
          .where('r.characterID = :id', { id: parent.id });
        if (!allowNsfw) {
          query = query.andWhere('s.subjectNsfw = :allowNsfw', { allowNsfw });
        }
        const relations = await query
          .orderBy('r.type', 'ASC')
          .orderBy('r.order', 'ASC')
          .skip(offset)
          .take(limit)
          .getMany();
        return relations.map((r) => ({
          subject: convertSubject(r.subject),
          type: r.type,
          order: r.order,
        }));
      },
    });
  },
});

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
        query = query.andWhere('c.ban = 0');
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
