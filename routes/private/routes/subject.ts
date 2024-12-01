import { Type as t } from '@sinclair/typebox';

import { db, op } from '@app/drizzle/db.ts';
import type * as orm from '@app/drizzle/orm.ts';
import * as schema from '@app/drizzle/schema';
import { NotFoundError } from '@app/lib/error.ts';
import { Security, Tag } from '@app/lib/openapi/index.ts';
import { EpisodeType, SubjectType } from '@app/lib/subject/type.ts';
import * as convert from '@app/lib/types/convert.ts';
import * as fetcher from '@app/lib/types/fetcher.ts';
import * as res from '@app/lib/types/res.ts';
import { formatErrors } from '@app/lib/types/res.ts';
import type { App } from '@app/routes/type.ts';

function toSubjectRelation(
  subject: orm.ISubject,
  relation: orm.ISubjectRelation,
): res.ISubjectRelation {
  return {
    subject: convert.toSlimSubject(subject),
    relation: convert.toSubjectRelationType(relation),
    order: relation.order,
  };
}

function toSubjectCharacter(
  character: orm.ICharacter,
  relation: orm.ICharacterSubject,
  actors: res.ISlimPerson[],
): res.ISubjectCharacter {
  return {
    character: convert.toSlimCharacter(character),
    actors: actors,
    type: relation.type,
    order: relation.order,
  };
}

function toSubjectPerson(person: orm.IPerson, relation: orm.IPersonSubject): res.ISubjectStaff {
  return {
    person: convert.toSlimPerson(person),
    position: convert.toSubjectStaffPosition(relation),
  };
}

// eslint-disable-next-line @typescript-eslint/require-await
export async function setup(app: App) {
  app.get(
    '/subjects/:subjectID',
    {
      schema: {
        summary: '获取条目',
        operationId: 'getSubject',
        tags: [Tag.Subject],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          subjectID: t.Integer(),
        }),
        response: {
          200: t.Ref(res.Subject),
          404: t.Ref(res.Error, {
            'x-examples': formatErrors(new NotFoundError('subject')),
          }),
        },
      },
    },
    async ({ auth, params: { subjectID } }) => {
      const data = await db
        .select()
        .from(schema.chiiSubjects)
        .innerJoin(
          schema.chiiSubjectFields,
          op.eq(schema.chiiSubjects.id, schema.chiiSubjectFields.id),
        )
        .where(
          op.and(
            op.eq(schema.chiiSubjects.id, subjectID),
            op.ne(schema.chiiSubjects.ban, 1),
            auth.allowNsfw ? undefined : op.eq(schema.chiiSubjects.nsfw, false),
          ),
        )
        .execute();
      for (const d of data) {
        return convert.toSubject(d.chii_subjects, d.chii_subject_fields);
      }
      throw new NotFoundError(`subject ${subjectID}`);
    },
  );

  app.get(
    '/subjects/:subjectID/episodes',
    {
      schema: {
        summary: '获取条目的剧集',
        operationId: 'getSubjectEpisodes',
        tags: [Tag.Subject],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          subjectID: t.Integer(),
        }),
        querystring: t.Object({
          type: t.Optional(t.Enum(EpisodeType, { description: '剧集类型' })),
          limit: t.Optional(
            t.Integer({ default: 100, minimum: 1, maximum: 1000, description: 'max 1000' }),
          ),
          offset: t.Optional(t.Integer({ default: 0, minimum: 0, description: 'min 0' })),
        }),
        response: {
          200: res.Paged(t.Ref(res.Episode)),
          404: t.Ref(res.Error, {
            'x-examples': formatErrors(new NotFoundError('subject')),
          }),
        },
      },
    },
    async ({ auth, params: { subjectID }, query: { type, limit = 100, offset = 0 } }) => {
      const subject = await fetcher.fetchSlimSubjectByID(subjectID, auth.allowNsfw);
      if (!subject) {
        throw new NotFoundError(`subject ${subjectID}`);
      }
      const condition = op.and(
        op.eq(schema.chiiEpisodes.subjectID, subjectID),
        op.ne(schema.chiiEpisodes.ban, 1),
        type ? op.eq(schema.chiiEpisodes.type, type.valueOf()) : undefined,
      );
      const [{ count = 0 } = {}] = await db
        .select({ count: op.count() })
        .from(schema.chiiEpisodes)
        .where(condition)
        .execute();
      const data = await db
        .select()
        .from(schema.chiiEpisodes)
        .where(condition)
        .orderBy(
          op.asc(schema.chiiEpisodes.disc),
          op.asc(schema.chiiEpisodes.type),
          op.asc(schema.chiiEpisodes.sort),
        )
        .limit(limit)
        .offset(offset)
        .execute();
      const episodes = data.map((d) => convert.toEpisode(d));
      return {
        data: episodes,
        total: count,
      };
    },
  );

  app.get(
    '/subjects/:subjectID/relations',
    {
      schema: {
        summary: '获取条目的关联条目',
        operationId: 'getSubjectRelations',
        tags: [Tag.Subject],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          subjectID: t.Integer(),
        }),
        querystring: t.Object({
          type: t.Optional(t.Enum(SubjectType, { description: '条目类型' })),
          offprint: t.Optional(t.Boolean({ default: false, description: '是否单行本' })),
          limit: t.Optional(
            t.Integer({ default: 20, minimum: 1, maximum: 100, description: 'max 100' }),
          ),
          offset: t.Optional(t.Integer({ default: 0, minimum: 0, description: 'min 0' })),
        }),
        response: {
          200: res.Paged(t.Ref(res.SubjectRelation)),
          404: t.Ref(res.Error, {
            'x-examples': formatErrors(new NotFoundError('subject')),
          }),
        },
      },
    },
    async ({ auth, params: { subjectID }, query: { type, offprint, limit = 20, offset = 0 } }) => {
      const subject = await fetcher.fetchSlimSubjectByID(subjectID, auth.allowNsfw);
      if (!subject) {
        throw new NotFoundError(`subject ${subjectID}`);
      }
      const relationTypeOffprint = 1003;
      const condition = op.and(
        op.eq(schema.chiiSubjectRelations.id, subjectID),
        type ? op.eq(schema.chiiSubjectRelations.relatedType, type) : undefined,
        offprint === undefined
          ? undefined
          : offprint
            ? op.eq(schema.chiiSubjectRelations.relation, relationTypeOffprint)
            : op.ne(schema.chiiSubjectRelations.relation, relationTypeOffprint),
        op.ne(schema.chiiSubjects.ban, 1),
        auth.allowNsfw ? undefined : op.eq(schema.chiiSubjects.nsfw, false),
      );
      const [{ count = 0 } = {}] = await db
        .select({ count: op.count() })
        .from(schema.chiiSubjectRelations)
        .innerJoin(
          schema.chiiSubjects,
          op.eq(schema.chiiSubjectRelations.relatedID, schema.chiiSubjects.id),
        )
        .where(condition)
        .execute();
      const data = await db
        .select()
        .from(schema.chiiSubjectRelations)
        .innerJoin(
          schema.chiiSubjects,
          op.eq(schema.chiiSubjectRelations.relatedID, schema.chiiSubjects.id),
        )
        .where(condition)
        .orderBy(
          op.asc(schema.chiiSubjectRelations.relation),
          op.asc(schema.chiiSubjectRelations.order),
        )
        .limit(limit)
        .offset(offset)
        .execute();
      const relations = data.map((d) =>
        toSubjectRelation(d.chii_subjects, d.chii_subject_relations),
      );
      return {
        data: relations,
        total: count,
      };
    },
  );

  app.get(
    '/subjects/:subjectID/characters',
    {
      schema: {
        summary: '获取条目的角色',
        operationId: 'getSubjectCharacters',
        tags: [Tag.Subject],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          subjectID: t.Integer(),
        }),
        querystring: t.Object({
          type: t.Optional(t.Integer({ description: '角色出场类型: 主角，配角，客串' })),
          limit: t.Optional(
            t.Integer({ default: 20, minimum: 1, maximum: 100, description: 'max 100' }),
          ),
          offset: t.Optional(t.Integer({ default: 0, minimum: 0, description: 'min 0' })),
        }),
        response: {
          200: res.Paged(t.Ref(res.SubjectCharacter)),
          404: t.Ref(res.Error, {
            'x-examples': formatErrors(new NotFoundError('subject')),
          }),
        },
      },
    },
    async ({ auth, params: { subjectID }, query: { type, limit = 20, offset = 0 } }) => {
      const subject = await fetcher.fetchSlimSubjectByID(subjectID, auth.allowNsfw);
      if (!subject) {
        throw new NotFoundError(`subject ${subjectID}`);
      }
      const condition = op.and(
        op.eq(schema.chiiCharacterSubjects.subjectID, subjectID),
        type ? op.eq(schema.chiiCharacterSubjects.type, type) : undefined,
        op.ne(schema.chiiCharacters.ban, 1),
        auth.allowNsfw ? undefined : op.eq(schema.chiiCharacters.nsfw, false),
      );
      const [{ count = 0 } = {}] = await db
        .select({ count: op.count() })
        .from(schema.chiiCharacterSubjects)
        .innerJoin(
          schema.chiiCharacters,
          op.eq(schema.chiiCharacterSubjects.characterID, schema.chiiCharacters.id),
        )
        .where(condition)
        .execute();
      const data = await db
        .select()
        .from(schema.chiiCharacterSubjects)
        .innerJoin(
          schema.chiiCharacters,
          op.eq(schema.chiiCharacterSubjects.characterID, schema.chiiCharacters.id),
        )
        .where(condition)
        .orderBy(
          op.asc(schema.chiiCharacterSubjects.type),
          op.asc(schema.chiiCharacterSubjects.order),
        )
        .limit(limit)
        .offset(offset)
        .execute();
      const characterIDs = data.map((d) => d.chii_characters.id);
      const casts = await fetcher.fetchCastsBySubjectAndCharacterIDs(
        subjectID,
        characterIDs,
        auth.allowNsfw,
      );
      const characters = data.map((d) =>
        toSubjectCharacter(
          d.chii_characters,
          d.chii_crt_subject_index,
          casts.get(d.chii_characters.id) || [],
        ),
      );
      return {
        data: characters,
        total: count,
      };
    },
  );

  app.get(
    '/subjects/:subjectID/staffs',
    {
      schema: {
        summary: '获取条目的制作人员',
        operationId: 'getSubjectStaffs',
        tags: [Tag.Subject],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          subjectID: t.Integer(),
        }),
        querystring: t.Object({
          position: t.Optional(t.Integer({ description: '人物职位: 监督，原案，脚本,..' })),
          limit: t.Optional(
            t.Integer({ default: 20, minimum: 1, maximum: 100, description: 'max 100' }),
          ),
          offset: t.Optional(t.Integer({ default: 0, minimum: 0, description: 'min 0' })),
        }),
        response: {
          200: res.Paged(t.Ref(res.SubjectStaff)),
          404: t.Ref(res.Error, {
            'x-examples': formatErrors(new NotFoundError('subject')),
          }),
        },
      },
    },
    async ({ auth, params: { subjectID }, query: { limit = 20, offset = 0 } }) => {
      const subject = await fetcher.fetchSlimSubjectByID(subjectID, auth.allowNsfw);
      if (!subject) {
        throw new NotFoundError(`subject ${subjectID}`);
      }
      const condition = op.and(
        op.eq(schema.chiiPersonSubjects.subjectID, subjectID),
        op.ne(schema.chiiPersons.ban, 1),
        auth.allowNsfw ? undefined : op.eq(schema.chiiPersons.nsfw, false),
      );
      const [{ count = 0 } = {}] = await db
        .select({ count: op.count() })
        .from(schema.chiiPersonSubjects)
        .innerJoin(
          schema.chiiPersons,
          op.eq(schema.chiiPersonSubjects.personID, schema.chiiPersons.id),
        )
        .where(condition)
        .execute();
      const data = await db
        .select()
        .from(schema.chiiPersonSubjects)
        .innerJoin(
          schema.chiiPersons,
          op.eq(schema.chiiPersonSubjects.personID, schema.chiiPersons.id),
        )
        .where(condition)
        .orderBy(op.asc(schema.chiiPersonSubjects.position))
        .limit(limit)
        .offset(offset)
        .execute();
      const persons = data.map((d) => toSubjectPerson(d.chii_persons, d.chii_person_cs_index));
      return {
        data: persons,
        total: count,
      };
    },
  );
}
