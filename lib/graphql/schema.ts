import * as fsp from 'node:fs/promises';
import * as path from 'node:path';

import { db, op, schema as ormSchema } from '@app/drizzle';
import { projectRoot } from '@app/lib/config.ts';
import type { Context } from '@app/lib/graphql/context.ts';
import { convertCharacter } from '@app/lib/graphql/resolvers/character.ts';
import { convertPerson } from '@app/lib/graphql/resolvers/person.ts';
import {
  convertSubject,
  convertTopic,
  subjectResolver,
} from '@app/lib/graphql/resolvers/subject.ts';
import { ListTopicDisplays } from '@app/lib/topic/display.ts';
import * as fetcher from '@app/lib/types/fetcher.ts';

import type * as types from './__generated__/resolvers.ts';

export const resolvers = {
  Query: {
    async me(_parent, _args, { auth }: Context) {
      if (!auth.userID) {
        return null;
      }

      const user = await fetcher.fetchSlimUserByID(auth.userID);
      if (!user) {
        return null;
      }

      return {
        id: user.id,
        avatar: user.avatar,
        nickname: user.nickname,
        username: user.username,
      };
    },

    subject: subjectResolver,

    async person(_parent, { id }: { id: number }, { auth: { allowNsfw } }: Context) {
      const conditions = [op.eq(ormSchema.chiiPersons.id, id), op.eq(ormSchema.chiiPersons.ban, 0)];
      if (!allowNsfw) {
        conditions.push(op.eq(ormSchema.chiiPersons.nsfw, false));
      }
      const [person] = await db
        .select()
        .from(ormSchema.chiiPersons)
        .where(op.and(...conditions));
      if (!person) {
        return null;
      }
      return convertPerson(person);
    },

    async character(_parent, { id }: { id: number }, { auth: { allowNsfw } }: Context) {
      const conditions = [
        op.eq(ormSchema.chiiCharacters.id, id),
        op.eq(ormSchema.chiiCharacters.ban, 0),
      ];
      if (!allowNsfw) {
        conditions.push(op.eq(ormSchema.chiiCharacters.nsfw, false));
      }
      const [character] = await db
        .select()
        .from(ormSchema.chiiCharacters)
        .where(op.and(...conditions));
      if (!character) {
        return null;
      }
      return convertCharacter(character);
    },
  },

  Subject: {
    tags(parent: types.Subject, { limit }): types.SubjectTag[] {
      if (limit && limit > 0) {
        return parent.tags.slice(0, limit);
      }

      return parent.tags;
    },

    async episodes(parent: { id: number }, { limit, offset, type }): Promise<types.Episode[]> {
      if (!parent.id) {
        return [];
      }

      if (offset < 0) {
        const [result] = await db
          .select({ count: op.count() })
          .from(ormSchema.chiiEpisodes)
          .where(op.eq(ormSchema.chiiEpisodes.subjectID, parent.id));

        if (!result || result.count === 0) {
          return [];
        }

        // if count == 1, offset == -2, offset should be 0
        offset = Math.max(result.count + offset, 0);
      }

      const conditions = [op.eq(ormSchema.chiiEpisodes.subjectID, parent.id)];
      if (type) {
        conditions.push(op.eq(ormSchema.chiiEpisodes.type, type));
      }
      const episodes = await db
        .select()
        .from(ormSchema.chiiEpisodes)
        .where(op.and(...conditions))
        .orderBy(ormSchema.chiiEpisodes.sort)
        .limit(limit)
        .offset(offset);

      return episodes.map((e) => {
        return {
          id: e.id,
          type: e.type,
          name: e.name,
          name_cn: e.nameCN,
          description: e.desc,
          airdate: e.airdate,
          comment: e.comment,
          last_post: e.updatedAt,
          disc: e.disc,
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
      const displays = ListTopicDisplays(u);
      const conditions = [op.eq(ormSchema.chiiSubjectTopics.subjectID, parent.id)];
      if (displays.length > 0) {
        conditions.push(op.inArray(ormSchema.chiiSubjectTopics.display, displays));
      }
      const data = await db
        .select()
        .from(ormSchema.chiiSubjectTopics)
        .innerJoin(
          ormSchema.chiiUsers,
          op.eq(ormSchema.chiiUsers.id, ormSchema.chiiSubjectTopics.uid),
        )
        .where(op.and(...conditions))
        .orderBy(op.desc(ormSchema.chiiSubjectTopics.createdAt))
        .limit(limit)
        .offset(offset);
      return data.map((d) => {
        return convertTopic(d.chii_subject_topics, d.chii_members);
      });
    },

    async persons(
      parent: { id: number },
      { limit, offset }: { limit: number; offset: number },
      { auth: { allowNsfw } }: Context,
    ) {
      const conditions = [op.eq(ormSchema.chiiPersonSubjects.subjectID, parent.id)];
      if (!allowNsfw) {
        conditions.push(op.eq(ormSchema.chiiPersons.nsfw, false));
      }
      const data = await db
        .select()
        .from(ormSchema.chiiPersonSubjects)
        .innerJoin(
          ormSchema.chiiPersons,
          op.eq(ormSchema.chiiPersonSubjects.personID, ormSchema.chiiPersons.id),
        )
        .where(op.and(...conditions))
        .orderBy(ormSchema.chiiPersonSubjects.position)
        .limit(limit)
        .offset(offset);
      return data.map((d) => {
        return {
          person: convertPerson(d.chii_persons),
          position: d.chii_person_cs_index.position,
        };
      });
    },

    async characters(
      parent: { id: number },
      { limit, offset }: { limit: number; offset: number },
      { auth: { allowNsfw } }: Context,
    ) {
      const conditions = [op.eq(ormSchema.chiiCharacterSubjects.subjectID, parent.id)];
      if (!allowNsfw) {
        conditions.push(op.eq(ormSchema.chiiCharacters.nsfw, false));
      }
      const data = await db
        .select()
        .from(ormSchema.chiiCharacterSubjects)
        .innerJoin(
          ormSchema.chiiCharacters,
          op.eq(ormSchema.chiiCharacterSubjects.characterID, ormSchema.chiiCharacters.id),
        )
        .where(op.and(...conditions))
        .orderBy(ormSchema.chiiCharacterSubjects.type, ormSchema.chiiCharacterSubjects.order)
        .limit(limit)
        .offset(offset);
      return data.map((d) => ({
        character: convertCharacter(d.chii_characters),
        type: d.chii_crt_subject_index.type,
        order: d.chii_crt_subject_index.order,
      }));
    },

    async relations(
      parent: { id: number },
      { limit, offset, includeTypes, excludeTypes },
      { auth: { allowNsfw } }: Context,
    ): Promise<types.SubjectRelation[]> {
      const conditions = [op.eq(ormSchema.chiiSubjectRelations.id, parent.id)];
      if (includeTypes && includeTypes.length > 0) {
        conditions.push(op.inArray(ormSchema.chiiSubjectRelations.relation, includeTypes));
      }
      if (excludeTypes && excludeTypes.length > 0) {
        conditions.push(op.notInArray(ormSchema.chiiSubjectRelations.relation, excludeTypes));
      }
      if (!allowNsfw) {
        conditions.push(op.eq(ormSchema.chiiSubjects.nsfw, false));
      }
      const data = await db
        .select()
        .from(ormSchema.chiiSubjectRelations)
        .innerJoin(
          ormSchema.chiiSubjects,
          op.eq(ormSchema.chiiSubjectRelations.relatedID, ormSchema.chiiSubjects.id),
        )
        .innerJoin(
          ormSchema.chiiSubjectFields,
          op.eq(ormSchema.chiiSubjects.id, ormSchema.chiiSubjectFields.id),
        )
        .where(op.and(...conditions))
        .orderBy(
          ormSchema.chiiSubjectRelations.relation,
          ormSchema.chiiSubjectRelations.order,
          ormSchema.chiiSubjectRelations.relatedID,
        )
        .limit(limit)
        .offset(offset);
      return data.map((d) => ({
        subject: convertSubject(d.chii_subjects, d.chii_subject_fields),
        relation: d.chii_subject_relations.relation,
        order: d.chii_subject_relations.order,
      }));
    },
  },
  Character: {
    async subjects(
      parent: { id: number },
      { limit, offset }: { limit: number; offset: number },
      { auth: { allowNsfw } }: Context,
    ) {
      const conditions = [op.eq(ormSchema.chiiCharacterSubjects.characterID, parent.id)];
      if (!allowNsfw) {
        conditions.push(op.eq(ormSchema.chiiSubjects.nsfw, false));
      }
      const data = await db
        .select()
        .from(ormSchema.chiiCharacterSubjects)
        .innerJoin(
          ormSchema.chiiSubjects,
          op.eq(ormSchema.chiiCharacterSubjects.subjectID, ormSchema.chiiSubjects.id),
        )
        .innerJoin(
          ormSchema.chiiSubjectFields,
          op.eq(ormSchema.chiiSubjects.id, ormSchema.chiiSubjectFields.id),
        )
        .where(op.and(...conditions))
        .orderBy(ormSchema.chiiCharacterSubjects.type, ormSchema.chiiCharacterSubjects.order)
        .limit(limit)
        .offset(offset);
      return data.map((d) => ({
        subject: convertSubject(d.chii_subjects, d.chii_subject_fields),
        type: d.chii_crt_subject_index.type,
        order: d.chii_crt_subject_index.order,
      }));
    },
    async persons(
      parent: { id: number },
      { limit, offset }: { limit: number; offset: number },
      { auth: { allowNsfw } }: Context,
    ) {
      const conditions = [op.eq(ormSchema.chiiCharacterCasts.characterID, parent.id)];
      if (!allowNsfw) {
        conditions.push(op.eq(ormSchema.chiiSubjects.nsfw, false));
      }
      const data = await db
        .select()
        .from(ormSchema.chiiCharacterCasts)
        .innerJoin(
          ormSchema.chiiPersons,
          op.eq(ormSchema.chiiCharacterCasts.personID, ormSchema.chiiPersons.id),
        )
        .innerJoin(
          ormSchema.chiiSubjects,
          op.eq(ormSchema.chiiCharacterCasts.subjectID, ormSchema.chiiSubjects.id),
        )
        .innerJoin(
          ormSchema.chiiSubjectFields,
          op.eq(ormSchema.chiiSubjects.id, ormSchema.chiiSubjectFields.id),
        )
        .where(op.and(...conditions))
        .limit(limit)
        .offset(offset);
      return data.map((d) => ({
        person: convertPerson(d.chii_persons),
        subject: convertSubject(d.chii_subjects, d.chii_subject_fields),
        summary: d.chii_crt_cast_index.summary,
      }));
    },
  },
  Person: {
    async characters(
      parent: { id: number },
      { limit, offset }: { limit: number; offset: number },
      { auth: { allowNsfw } }: Context,
    ) {
      const conditions = [op.eq(ormSchema.chiiCharacterCasts.personID, parent.id)];
      if (!allowNsfw) {
        conditions.push(op.eq(ormSchema.chiiSubjects.nsfw, false));
      }
      const data = await db
        .select()
        .from(ormSchema.chiiCharacterCasts)
        .innerJoin(
          ormSchema.chiiCharacters,
          op.eq(ormSchema.chiiCharacterCasts.characterID, ormSchema.chiiCharacters.id),
        )
        .innerJoin(
          ormSchema.chiiSubjects,
          op.eq(ormSchema.chiiCharacterCasts.subjectID, ormSchema.chiiSubjects.id),
        )
        .innerJoin(
          ormSchema.chiiSubjectFields,
          op.eq(ormSchema.chiiSubjects.id, ormSchema.chiiSubjectFields.id),
        )
        .where(op.and(...conditions))
        .limit(limit)
        .offset(offset);
      return data.map((d) => ({
        character: convertCharacter(d.chii_characters),
        subject: convertSubject(d.chii_subjects, d.chii_subject_fields),
        summary: d.chii_crt_cast_index.summary,
      }));
    },

    async subjects(
      parent: { id: number },
      { limit, offset }: { limit: number; offset: number },
      { auth: { allowNsfw } }: Context,
    ) {
      const conditions = [op.eq(ormSchema.chiiPersonSubjects.personID, parent.id)];
      if (!allowNsfw) {
        conditions.push(op.eq(ormSchema.chiiSubjects.nsfw, false));
      }
      const data = await db
        .select()
        .from(ormSchema.chiiPersonSubjects)
        .innerJoin(
          ormSchema.chiiSubjects,
          op.eq(ormSchema.chiiPersonSubjects.subjectID, ormSchema.chiiSubjects.id),
        )
        .innerJoin(
          ormSchema.chiiSubjectFields,
          op.eq(ormSchema.chiiSubjects.id, ormSchema.chiiSubjectFields.id),
        )
        .where(op.and(...conditions))
        .orderBy(ormSchema.chiiPersonSubjects.position)
        .limit(limit)
        .offset(offset);
      return data.map((d) => ({
        subject: convertSubject(d.chii_subjects, d.chii_subject_fields),
        position: d.chii_person_cs_index.position,
      }));
    },
  },
} satisfies types.Resolvers;

export const schema = await fsp.readFile(
  path.join(projectRoot, 'lib', 'graphql', 'schema.graphql'),
  'utf8',
);
