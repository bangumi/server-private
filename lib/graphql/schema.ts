import * as fsp from 'node:fs/promises';
import * as path from 'node:path';

import { projectRoot } from '@app/lib/config.ts';
import type { Context } from '@app/lib/graphql/context.ts';
import { convertCharacter } from '@app/lib/graphql/types/character.ts';
import { convertPerson } from '@app/lib/graphql/types/person.ts';
import { convertSubject, convertTopic } from '@app/lib/graphql/types/subject.ts';
import * as entity from '@app/lib/orm/entity/index.ts';
import {
  CharacterSubjectsRepo,
  fetchUser,
  PersonSubjectsRepo,
  SubjectRelationRepo,
  SubjectRepo,
  SubjectTopicRepo,
} from '@app/lib/orm/index.ts';
import { avatar } from '@app/lib/response.ts';
import { ListTopicDisplays } from '@app/lib/topic/index.ts';

import type * as types from './__generated__/resolvers.ts';

const subjectResolver: types.QueryResolvers['subject'] = async (
  _parent,
  { id },
  { auth: { allowNsfw } },
): Promise<types.Subject | null> => {
  let query = SubjectRepo.createQueryBuilder('s')
    .innerJoinAndMapOne('s.fields', entity.SubjectFields, 'f', 'f.subjectID = s.id')
    .where('s.id = :id', { id });
  if (!allowNsfw) {
    query = query.andWhere('s.subjectNsfw = :allowNsfw', { allowNsfw });
  }
  const subject = await query.getOne();
  if (!subject) {
    return null;
  }

  return convertSubject(subject);
};

export const resolvers = {
  Query: {
    async me(_parent, _args, { auth }: Context) {
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

    subject: subjectResolver,
  },

  Subject: {
    tags(parent, { limit }): types.SubjectTag[] {
      if (limit && limit > 0) {
        return parent.tags.slice(0, limit);
      }

      return parent.tags;
    },

    async episodes(
      parent: { id: number },
      { limit, offset, type },
      { repo }: Context,
    ): Promise<types.Episode[]> {
      if (!parent.id) {
        return [];
      }

      if (offset < 0) {
        const count = await repo.Episode.createQueryBuilder('t')
          .where('t.subjectID = :s', { s: parent.id })
          .getCount();

        offset = count + offset;
      }

      let s = repo.Episode.createQueryBuilder('t')
        .select()
        .where('t.subjectID = :s', { s: parent.id });
      if (type) {
        s = s.andWhere('t.type = :t', { t: type });
      }
      const episodes = await s.orderBy('t.sort', 'ASC').limit(limit).offset(offset).getMany();

      return episodes.map((e: entity.Episode) => {
        return {
          id: e.id,
          type: e.type,
          name: e.name,
          name_cn: e.nameCN,
          description: e.summary,
          airdate: e.airDate,
          comment: e.epComment,
          last_post: e.epLastPost,
          disc: e.epDisc,
          duration: e.duration,
          sort: e.sort,
        };
      });
    },

    async topics(
      parent: { id: number },
      { limit, offset }: { limit: number; offset: number },
      { auth: u }: Context,
    ) {
      let query = SubjectTopicRepo.createQueryBuilder('t')
        .innerJoinAndMapOne('t.creator', entity.User, 'u', 'u.id = t.creatorID')
        .where('t.parentID = :id', { id: parent.id });
      const displays = ListTopicDisplays(u);
      if (displays.length > 0) {
        query = query.andWhere('t.display IN (:...displays)', { displays });
      }
      const topics = await query.orderBy('t.createdAt', 'DESC').skip(offset).take(limit).getMany();
      return topics.map((t) => {
        return convertTopic(t);
      });
    },

    async persons(
      parent: { id: number },
      { limit, offset }: { limit: number; offset: number },
      { auth: { allowNsfw } }: Context,
    ) {
      let query = PersonSubjectsRepo.createQueryBuilder('r')
        .innerJoinAndMapOne('r.person', entity.Person, 'p', 'p.id = r.personID')
        .where('r.subjectID = :id', { id: parent.id });
      if (!allowNsfw) {
        query = query.andWhere('p.nsfw = :allowNsfw', { allowNsfw });
      }
      const relations = await query.orderBy('r.position', 'ASC').skip(offset).take(limit).getMany();
      return relations.map((r) => {
        return {
          person: convertPerson(r.person),
          position: r.position,
        };
      });
    },

    async characters(
      parent: { id: number },
      { limit, offset }: { limit: number; offset: number },
      { auth: { allowNsfw } }: Context,
    ) {
      let query = CharacterSubjectsRepo.createQueryBuilder('r')
        .innerJoinAndMapOne('r.character', entity.Character, 'c', 'c.id = r.characterID')
        .where('r.subjectID = :id', { id: parent.id });
      if (!allowNsfw) {
        query = query.andWhere('c.nsfw = :allowNsfw', { allowNsfw });
      }
      const relations = await query
        .orderBy('r.type', 'ASC')
        .orderBy('r.order', 'ASC')
        .skip(offset)
        .take(limit)
        .getMany();
      return relations.map((r) => {
        return {
          character: convertCharacter(r.character),
          type: r.type,
          order: r.order,
        };
      });
    },

    async relations(
      parent: { id: number },
      { limit, offset, includeTypes, excludeTypes },
      { auth: { allowNsfw } }: Context,
    ): Promise<types.SubjectRelation[]> {
      let query = SubjectRelationRepo.createQueryBuilder('r')
        .innerJoinAndMapOne('r.relatedSubject', entity.Subject, 's', 's.id = r.relatedSubjectID')
        .innerJoinAndMapOne('s.fields', entity.SubjectFields, 'f', 'f.subjectID = s.id')
        .where('r.subjectID = :id', { id: parent.id });
      if (includeTypes && includeTypes.length > 0) {
        query = query.andWhere('r.relationType IN (:...includeTypes)', { includeTypes });
      }
      if (excludeTypes && excludeTypes.length > 0) {
        query = query.andWhere('r.relationType NOT IN (:...excludeTypes)', { excludeTypes });
      }
      if (!allowNsfw) {
        query = query.andWhere('s.subjectNsfw = :allowNsfw', { allowNsfw });
      }
      const relations = await query
        .orderBy('r.relationType', 'ASC')
        .orderBy('r.order', 'ASC')
        .orderBy('r.relatedSubjectID', 'ASC')
        .skip(offset)
        .take(limit)
        .getMany();
      return relations.map((r: entity.SubjectRelation) => {
        return {
          subject: convertSubject(r.relatedSubject),
          relation: r.relationType,
          order: r.order,
        };
      });
    },
  },
} satisfies types.Resolvers;

export const schema = await fsp.readFile(
  path.join(projectRoot, 'lib', 'graphql', 'schema.graphql'),
  'utf8',
);
