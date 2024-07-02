import type { Wiki } from '@bgm38/wiki';
import { parse as parseWiki, WikiSyntaxError } from '@bgm38/wiki';
import { extendType, intArg, nonNull, objectType } from 'nexus';

import type { Context } from '@app/lib/graphql/context.ts';
import * as entity from '@app/lib/orm/entity/index.ts';
import { CastRepo, PersonRepo, PersonSubjectsRepo } from '@app/lib/orm/index.ts';
import { personImages } from '@app/lib/response.ts';

import { convertCharacter } from './character.ts';
import { Images, InfoboxItem } from './common.ts';
import { convertSubject } from './subject.ts';

const PersonRelatedSubject = objectType({
  name: 'PersonRelatedSubject',
  definition(t) {
    t.nonNull.field('subject', {
      type: 'Subject',
    });
    t.nonNull.int('position');
  },
});

const PersonRelatedCharacter = objectType({
  name: 'PersonRelatedCharacter',
  definition(t) {
    t.nonNull.field('character', {
      type: 'Character',
    });
    t.nonNull.field('subject', {
      type: 'Subject',
    });
    t.nonNull.string('summary');
  },
});

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
    t.list.nonNull.field('subjects', {
      type: PersonRelatedSubject,
      args: {
        limit: nonNull(intArg({ default: 10 })),
        offset: nonNull(intArg({ default: 0 })),
      },
      async resolve(
        parent: { id: number },
        { limit, offset }: { limit: number; offset: number },
        { auth: { allowNsfw } }: Context,
      ) {
        let query = PersonSubjectsRepo.createQueryBuilder('r')
          .innerJoinAndMapOne('r.subject', entity.Subject, 's', 's.id = r.subjectID')
          .innerJoinAndMapOne('s.fields', entity.SubjectFields, 'f', 'f.subjectID = s.id')
          .where('r.personID = :id', { id: parent.id });
        if (!allowNsfw) {
          query = query.andWhere('s.subjectNsfw = :allowNsfw', { allowNsfw });
        }
        const relations = await query
          .orderBy('r.position', 'ASC')
          .skip(offset)
          .take(limit)
          .getMany();
        return relations.map((r) => ({
          subject: convertSubject(r.subject),
          position: r.position,
        }));
      },
    });
    t.list.nonNull.field('characters', {
      type: PersonRelatedCharacter,
      args: {
        limit: nonNull(intArg({ default: 10 })),
        offset: nonNull(intArg({ default: 0 })),
      },
      async resolve(
        parent: { id: number },
        { limit, offset }: { limit: number; offset: number },
        { auth: { allowNsfw } }: Context,
      ) {
        const query = CastRepo.createQueryBuilder('r')
          .innerJoinAndMapOne('r.character', entity.Character, 'c', 'c.id = r.characterID')
          .innerJoinAndMapOne('r.subject', entity.Subject, 's', 's.id = r.subjectID')
          .innerJoinAndMapOne('s.fields', entity.SubjectFields, 'f', 'f.subjectID = s.id')
          .where('r.personID = :id', { id: parent.id });
        if (!allowNsfw) {
          query.andWhere('s.subjectNsfw = :allowNsfw', { allowNsfw });
        }
        const relations = await query.skip(offset).take(limit).getMany();
        return relations.map((r) => ({
          character: convertCharacter(r.character),
          subject: convertSubject(r.subject),
          summary: r.summary,
        }));
      },
    });
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

export function convertPerson(person: entity.Person) {
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
