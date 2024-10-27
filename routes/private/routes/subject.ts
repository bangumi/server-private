import type { Static } from '@sinclair/typebox';
import { Type as t } from '@sinclair/typebox';

import { db, op } from '@app/drizzle/db.ts';
import type * as orm from '@app/drizzle/orm.ts';
import * as schema from '@app/drizzle/schema';
import { NotFoundError } from '@app/lib/error.ts';
import { Security, Tag } from '@app/lib/openapi/index.ts';
import { SubjectType } from '@app/lib/subject/type.ts';
import * as convert from '@app/lib/types/convert.ts';
import * as fetcher from '@app/lib/types/fetcher.ts';
import * as res from '@app/lib/types/res.ts';
import { formatErrors } from '@app/lib/types/res.ts';
import type { App } from '@app/routes/type.ts';

export type ISubjectRelation = Static<typeof SubjectRelation>;
const SubjectRelation = t.Object(
  {
    subject: t.Ref(res.SlimSubject),
    relation: t.Integer(),
    order: t.Integer(),
  },
  { $id: 'SubjectRelation' },
);

function toSubjectRelation(
  subject: orm.ISubject,
  relation: orm.ISubjectRelation,
): ISubjectRelation {
  return {
    subject: convert.toSlimSubject(subject),
    relation: relation.relation,
    order: relation.order,
  };
}

export type ISubjectCharacter = Static<typeof SubjectCharacter>;
const SubjectCharacter = t.Object(
  {
    character: t.Ref(res.SlimCharacter),
    type: t.Integer(),
    order: t.Integer(),
  },
  { $id: 'SubjectCharacter' },
);

function toSubjectCharacter(
  character: orm.ICharacter,
  relation: orm.ISubjectCharacter,
): ISubjectCharacter {
  return {
    character: convert.toSlimCharacter(character),
    type: relation.type,
    order: relation.order,
  };
}

export type ISubjectPerson = Static<typeof SubjectPerson>;
const SubjectPerson = t.Object(
  {
    person: t.Ref(res.SlimPerson),
    position: t.Integer(),
    summary: t.String(),
  },
  { $id: 'SubjectPerson' },
);

function toSubjectPerson(person: orm.IPerson, relation: orm.ISubjectPerson): ISubjectPerson {
  return {
    person: convert.toSlimPerson(person),
    position: relation.position,
    summary: relation.summary,
  };
}

// eslint-disable-next-line @typescript-eslint/require-await
export async function setup(app: App) {
  app.addSchema(SubjectRelation);
  app.addSchema(SubjectCharacter);
  app.addSchema(SubjectPerson);

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
            op.eq(schema.chiiSubjects.ban, 0),
            auth.allowNsfw ? undefined : op.eq(schema.chiiSubjects.nsfw, false),
          ),
        )
        .execute();
      for (const d of data) {
        return convert.toSubject(d.subject, d.subject_field);
      }
      throw new NotFoundError(`subject ${subjectID}`);
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
          singles: t.Boolean({ default: false, description: '包括单行本' }),
          limit: t.Optional(
            t.Integer({ default: 20, minimum: 1, maximum: 100, description: 'max 100' }),
          ),
          offset: t.Optional(t.Integer({ default: 0, minimum: 0, description: 'min 0' })),
        }),
        response: {
          200: res.Paged(t.Ref(SubjectRelation)),
          404: t.Ref(res.Error, {
            'x-examples': formatErrors(new NotFoundError('subject')),
          }),
        },
      },
    },
    async ({ auth, params: { subjectID }, query: { type, singles, limit = 20, offset = 0 } }) => {
      const subject = await fetcher.fetchSlimSubjectByID(subjectID, auth.allowNsfw);
      if (!subject) {
        throw new NotFoundError(`subject ${subjectID}`);
      }
      const condition = op.and(
        op.eq(schema.chiiSubjectRelations.id, subjectID),
        type ? op.eq(schema.chiiSubjectRelations.relatedType, type) : undefined,
        // TODO: bangumi common add relation.json
        singles ? undefined : op.ne(schema.chiiSubjectRelations.relatedType, 1003),
        op.eq(schema.chiiSubjects.ban, 0),
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
      const relations = data.map((d) => toSubjectRelation(d.subject, d.chii_subject_relations));
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
        summary: '获取条目的关联角色',
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
          200: res.Paged(t.Ref(SubjectCharacter)),
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
        op.eq(schema.chiiSubjectCharacters.subjectID, subjectID),
        type ? op.eq(schema.chiiSubjectCharacters.type, type) : undefined,
      );
      const [{ count = 0 } = {}] = await db
        .select({ count: op.count() })
        .from(schema.chiiSubjectCharacters)
        .innerJoin(
          schema.chiiCharacters,
          op.eq(schema.chiiSubjectCharacters.characterID, schema.chiiCharacters.id),
        )
        .where(condition)
        .execute();
      const data = await db
        .select()
        .from(schema.chiiSubjectCharacters)
        .innerJoin(
          schema.chiiCharacters,
          op.eq(schema.chiiSubjectCharacters.characterID, schema.chiiCharacters.id),
        )
        .where(condition)
        .orderBy(op.asc(schema.chiiSubjectCharacters.order))
        .limit(limit)
        .offset(offset)
        .execute();
      const characters = data.map((d) =>
        toSubjectCharacter(d.chii_characters, d.chii_crt_subject_index),
      );
      return {
        data: characters,
        total: count,
      };
    },
  );

  app.get(
    '/subjects/:subjectID/persons',
    {
      schema: {
        summary: '获取条目的关联人物',
        operationId: 'getSubjectPersons',
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
          200: res.Paged(t.Ref(SubjectPerson)),
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
      const condition = op.eq(schema.chiiSubjectPersons.subjectID, subjectID);
      const [{ count = 0 } = {}] = await db
        .select({ count: op.count() })
        .from(schema.chiiSubjectPersons)
        .innerJoin(
          schema.chiiPersons,
          op.eq(schema.chiiSubjectPersons.personID, schema.chiiPersons.id),
        )
        .where(condition)
        .execute();
      const data = await db
        .select()
        .from(schema.chiiSubjectPersons)
        .innerJoin(
          schema.chiiPersons,
          op.eq(schema.chiiSubjectPersons.personID, schema.chiiPersons.id),
        )
        .where(condition)
        .orderBy(op.asc(schema.chiiSubjectPersons.position))
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
