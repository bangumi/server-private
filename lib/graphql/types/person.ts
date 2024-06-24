import type { Wiki } from '@bgm38/wiki';
import { parse as parseWiki, WikiSyntaxError } from '@bgm38/wiki';
import { extendType, intArg, nonNull, objectType } from 'nexus';

import type { Context } from '@app/lib/graphql/context.ts';
import type * as entity from '@app/lib/orm/entity/index.ts';
import { PersonRepo } from '@app/lib/orm/index.ts';
import { personImages } from '@app/lib/response.ts';

import { Images, InfoboxItem } from './common.ts';

const Person = objectType({
  name: 'Person',
  definition(t) {
    t.nonNull.int('id');
    t.nonNull.string('name');
    t.nonNull.int('type');
    t.list.nonNull.field('infobox', { type: InfoboxItem });
    t.nonNull.list.nonNull.string('career');
    t.nonNull.string('summary');
    t.nullable.field('images', { type: Images });
    t.nonNull.int('comment');
    t.nonNull.int('collects');
    t.nonNull.int('last_post');
    t.nonNull.int('lock');
    t.nonNull.int('redirect');
    t.nonNull.boolean('nsfw');
  },
});

function convertCareer(person: entity.Person) {
  const result: string[] = [];
  if (person.producer) {
    result.push('producer');
  }
  if (person.mangaka) {
    result.push('mangaka');
  }
  if (person.artist) {
    result.push('artist');
  }
  if (person.seiyu) {
    result.push('seiyu');
  }
  if (person.writer) {
    result.push('writer');
  }
  if (person.illustrator) {
    result.push('illustrator');
  }
  if (person.actor) {
    result.push('actor');
  }
  return result;
}

function convertPerson(person: entity.Person) {
  let wiki: Wiki = {
    type: '',
    data: [],
  };
  try {
    wiki = parseWiki(person.infobox);
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
    id: person.id,
    name: person.name,
    type: person.type,
    infobox,
    career: convertCareer(person),
    summary: person.summary,
    images: personImages(person.img),
    comment: person.comment,
    collects: person.collects,
    last_post: person.lastPost,
    lock: person.lock,
    redirect: person.redirect,
    nsfw: person.nsfw,
  };
}

const PersonByIDQuery = extendType({
  type: 'Query',
  definition(t) {
    t.nonNull.field('person', {
      type: 'Person',
      args: { id: nonNull(intArg()) },
      async resolve(_parent, { id }: { id: number }, { auth: { allowNsfw } }: Context) {
        let query = PersonRepo.createQueryBuilder('c').where('c.id = :id', { id });
        if (!allowNsfw) {
          query = query.andWhere('c.nsfw = :allowNsfw', { allowNsfw });
        }
        query = query.andWhere('c.ban = 0');
        const person = await query.getOne();
        if (!person) {
          return null;
        }
        return convertPerson(person);
      },
    });
  },
});

export default [Person, PersonByIDQuery];
