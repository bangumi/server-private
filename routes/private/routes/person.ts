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

export type IPersonRelation = Static<typeof PersonRelation>;
const PersonRelation = t.Object(
  {
    person: t.Ref(res.SlimPerson),
    relation: t.Integer({ description: '人物关系: 任职于,从属,聘用,嫁给...' }),
  },
  { $id: 'PersonRelation' },
);

function toPersonRelation(person: orm.IPerson, relation: orm.IPersonRelation): IPersonRelation {
  return {
    person: convert.toSlimPerson(person),
    relation: relation.relation,
  };
}

export type IPersonSubject = Static<typeof PersonSubject>;
const PersonSubject = t.Object(
  {
    subject: t.Ref(res.SlimSubject),
    position: t.Integer(),
  },
  { $id: 'PersonSubject' },
);

function toPersonSubject(subject: orm.ISubject, relation: orm.IPersonSubject): IPersonSubject {
  return {
    subject: convert.toSlimSubject(subject),
    position: relation.position,
  };
}

export type IPersonCharacter = Static<typeof PersonCharacter>;
const PersonCharacter = t.Object(
  {
    character: t.Ref(res.SlimCharacter),
    subjects: t.Array(t.Ref(res.SlimSubject)),
  },
  { $id: 'PersonCharacter' },
);

function toPersonCharacter(
  character: orm.ICharacter,
  subjects: res.ISlimSubject[],
): IPersonCharacter {
  return {
    character: convert.toSlimCharacter(character),
    subjects: subjects,
  };
}

export type IPersonCollect = Static<typeof PersonCollect>;
const PersonCollect = t.Object(
  {
    user: t.Ref(res.SlimUser),
    createdAt: t.Integer(),
  },
  { $id: 'PersonCollect' },
);

function toPersonCollect(user: orm.IUser, collect: orm.IPersonCollect): IPersonCollect {
  return {
    user: convert.toSlimUser(user),
    createdAt: collect.createdAt,
  };
}

// eslint-disable-next-line @typescript-eslint/require-await
export async function setup(app: App) {
  app.addSchema(PersonRelation);
  app.addSchema(PersonSubject);
  app.addSchema(PersonCharacter);
  app.addSchema(PersonCollect);

  app.get(
    '/persons/:personID',
    {
      schema: {
        summary: '获取人物',
        operationId: 'getPerson',
        tags: [Tag.Person],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          personID: t.Integer(),
        }),
        response: {
          200: t.Ref(res.Person),
          404: t.Ref(res.Error, {
            'x-examples': formatErrors(new NotFoundError('person')),
          }),
        },
      },
    },
    async ({ auth, params: { personID } }) => {
      const data = await db
        .select()
        .from(schema.chiiPersons)
        .where(
          op.and(
            op.eq(schema.chiiPersons.id, personID),
            op.eq(schema.chiiPersons.ban, 0),
            auth.allowNsfw ? undefined : op.eq(schema.chiiPersons.nsfw, false),
          ),
        )
        .execute();
      for (const d of data) {
        return convert.toPerson(d);
      }
      throw new NotFoundError(`person ${personID}`);
    },
  );

  app.get(
    '/persons/:personID/relations',
    {
      schema: {
        summary: '获取人物关联人物',
        operationId: 'getPersonRelations',
        tags: [Tag.Person],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          personID: t.Integer(),
        }),
        querystring: t.Object({
          limit: t.Optional(
            t.Integer({ default: 20, minimum: 1, maximum: 100, description: 'max 100' }),
          ),
          offset: t.Optional(t.Integer({ default: 0, minimum: 0, description: 'min 0' })),
        }),
        response: {
          200: res.Paged(t.Ref(PersonRelation)),
          404: t.Ref(res.Error, {
            'x-examples': formatErrors(new NotFoundError('person')),
          }),
        },
      },
    },
    async ({ auth, params: { personID }, query: { limit = 20, offset = 0 } }) => {
      const person = await fetcher.fetchSlimPersonByID(personID, auth.allowNsfw);
      if (!person) {
        throw new NotFoundError(`person ${personID}`);
      }
      const condition = op.and(
        op.eq(schema.chiiPersonRelations.id, personID),
        op.eq(schema.chiiPersons.ban, 0),
        auth.allowNsfw ? undefined : op.eq(schema.chiiPersons.nsfw, false),
      );
      const [{ count = 0 } = {}] = await db
        .select({ count: op.count() })
        .from(schema.chiiPersonRelations)
        .innerJoin(
          schema.chiiPersons,
          op.eq(schema.chiiPersonRelations.relatedID, schema.chiiPersons.id),
        )
        .where(condition)
        .execute();
      const data = await db
        .select()
        .from(schema.chiiPersonRelations)
        .innerJoin(
          schema.chiiPersons,
          op.eq(schema.chiiPersonRelations.relatedID, schema.chiiPersons.id),
        )
        .where(condition)
        .orderBy(
          op.asc(schema.chiiPersonRelations.relation),
          op.desc(schema.chiiPersonRelations.relatedID),
        )
        .limit(limit)
        .offset(offset)
        .execute();
      const persons = data.map((d) => toPersonRelation(d.chii_persons, d.chii_person_relationship));
      return {
        total: count,
        data: persons,
      };
    },
  );

  app.get(
    '/persons/:personID/works',
    {
      schema: {
        summary: '获取人物参与作品',
        operationId: 'getPersonWorks',
        tags: [Tag.Person],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          personID: t.Integer(),
        }),
        querystring: t.Object({
          subjectType: t.Optional(t.Enum(SubjectType, { description: '条目类型' })),
          position: t.Optional(t.Integer({ description: '职位' })),
          limit: t.Optional(
            t.Integer({ default: 20, minimum: 1, maximum: 100, description: 'max 100' }),
          ),
          offset: t.Optional(t.Integer({ default: 0, minimum: 0, description: 'min 0' })),
        }),
        response: {
          200: res.Paged(t.Ref(PersonSubject)),
          404: t.Ref(res.Error, {
            'x-examples': formatErrors(new NotFoundError('person')),
          }),
        },
      },
    },
    async ({
      auth,
      params: { personID },
      query: { subjectType, position, limit = 20, offset = 0 },
    }) => {
      const person = await fetcher.fetchSlimPersonByID(personID, auth.allowNsfw);
      if (!person) {
        throw new NotFoundError(`person ${personID}`);
      }
      const condition = op.and(
        op.eq(schema.chiiPersonSubjects.personID, personID),
        subjectType ? op.eq(schema.chiiPersonSubjects.subjectType, subjectType) : undefined,
        position ? op.eq(schema.chiiPersonSubjects.position, position) : undefined,
        op.eq(schema.chiiSubjects.ban, 0),
        auth.allowNsfw ? undefined : op.eq(schema.chiiSubjects.nsfw, false),
      );
      const [{ count = 0 } = {}] = await db
        .select({ count: op.count() })
        .from(schema.chiiPersonSubjects)
        .innerJoin(
          schema.chiiSubjects,
          op.eq(schema.chiiPersonSubjects.subjectID, schema.chiiSubjects.id),
        )
        .where(condition)
        .execute();
      const data = await db
        .select()
        .from(schema.chiiPersonSubjects)
        .innerJoin(
          schema.chiiSubjects,
          op.eq(schema.chiiPersonSubjects.subjectID, schema.chiiSubjects.id),
        )
        .where(condition)
        .orderBy(op.desc(schema.chiiPersonSubjects.subjectID))
        .limit(limit)
        .offset(offset)
        .execute();
      const subjects = data.map((d) => toPersonSubject(d.chii_subjects, d.chii_person_cs_index));
      return {
        total: count,
        data: subjects,
      };
    },
  );

  app.get(
    '/persons/:personID/casts',
    {
      schema: {
        summary: '获取人物出演角色',
        operationId: 'getPersonCasts',
        tags: [Tag.Person],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          personID: t.Integer(),
        }),
        querystring: t.Object({
          subjectType: t.Optional(t.Enum(SubjectType, { description: '条目类型' })),
          type: t.Optional(t.Integer({ description: '角色出场类型: 主角，配角，客串' })),
          limit: t.Optional(
            t.Integer({ default: 20, minimum: 1, maximum: 100, description: 'max 100' }),
          ),
          offset: t.Optional(t.Integer({ default: 0, minimum: 0, description: 'min 0' })),
        }),
        response: {
          200: res.Paged(t.Ref(PersonCharacter)),
          404: t.Ref(res.Error, {
            'x-examples': formatErrors(new NotFoundError('person')),
          }),
        },
      },
    },
    async ({
      auth,
      params: { personID },
      query: { subjectType, type, limit = 20, offset = 0 },
    }) => {
      const person = await fetcher.fetchSlimPersonByID(personID, auth.allowNsfw);
      if (!person) {
        throw new NotFoundError(`person ${personID}`);
      }
      const condition = op.and(
        op.eq(schema.chiiCharacterCasts.personID, personID),
        subjectType ? op.eq(schema.chiiCharacterCasts.subjectType, subjectType) : undefined,
        type ? op.eq(schema.chiiCharacterSubjects.type, type) : undefined,
        op.eq(schema.chiiCharacters.ban, 0),
        auth.allowNsfw ? undefined : op.eq(schema.chiiCharacters.nsfw, false),
      );
      const [{ count = 0 } = {}] = await db
        .select({ count: op.count() })
        .from(schema.chiiCharacterCasts)
        .innerJoin(
          schema.chiiCharacters,
          op.eq(schema.chiiCharacterCasts.characterID, schema.chiiCharacters.id),
        )
        .innerJoin(
          schema.chiiCharacterSubjects,
          op.and(
            op.eq(schema.chiiCharacterCasts.characterID, schema.chiiCharacterSubjects.characterID),
            op.eq(schema.chiiCharacterCasts.subjectID, schema.chiiCharacterSubjects.subjectID),
          ),
        )
        .where(condition)
        .execute();
      const data = await db
        .select()
        .from(schema.chiiCharacterCasts)
        .innerJoin(
          schema.chiiCharacters,
          op.and(op.eq(schema.chiiCharacterCasts.characterID, schema.chiiCharacters.id)),
        )
        .innerJoin(
          schema.chiiCharacterSubjects,
          op.and(
            op.eq(schema.chiiCharacterCasts.characterID, schema.chiiCharacterSubjects.characterID),
            op.eq(schema.chiiCharacterCasts.subjectID, schema.chiiCharacterSubjects.subjectID),
          ),
        )
        .where(condition)
        .orderBy(op.desc(schema.chiiCharacterCasts.characterID))
        .limit(limit)
        .offset(offset)
        .execute();
      const characterIDs = data.map((d) => d.chii_crt_cast_index.characterID);
      const subjects = await fetcher.fetchCastsByPersonAndCharacterIDs(
        personID,
        characterIDs,
        subjectType,
        type,
        auth.allowNsfw,
      );
      const characters = data.map((d) =>
        toPersonCharacter(d.chii_characters, subjects.get(d.chii_crt_cast_index.characterID) || []),
      );
      return {
        total: count,
        data: characters,
      };
    },
  );

  app.get(
    '/persons/:personID/collects',
    {
      schema: {
        summary: '获取人物的收藏用户',
        operationId: 'getPersonCollects',
        tags: [Tag.Person],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          personID: t.Integer(),
        }),
        querystring: t.Object({
          limit: t.Optional(
            t.Integer({ default: 20, minimum: 1, maximum: 100, description: 'max 100' }),
          ),
          offset: t.Optional(t.Integer({ default: 0, minimum: 0, description: 'min 0' })),
        }),
        response: {
          200: res.Paged(t.Ref(PersonCollect)),
          404: t.Ref(res.Error, {
            'x-examples': formatErrors(new NotFoundError('person')),
          }),
        },
      },
    },
    async ({ auth, params: { personID }, query: { limit = 20, offset = 0 } }) => {
      const person = await fetcher.fetchSlimPersonByID(personID, auth.allowNsfw);
      if (!person) {
        throw new NotFoundError(`person ${personID}`);
      }
      const condition = op.and(
        op.eq(schema.chiiPersonCollects.cat, 'prsn'),
        op.eq(schema.chiiPersonCollects.mid, personID),
      );
      const [{ count = 0 } = {}] = await db
        .select({ count: op.count() })
        .from(schema.chiiPersonCollects)
        .innerJoin(schema.chiiUsers, op.eq(schema.chiiPersonCollects.uid, schema.chiiUsers.id))
        .where(condition)
        .execute();
      const data = await db
        .select()
        .from(schema.chiiPersonCollects)
        .innerJoin(schema.chiiUsers, op.eq(schema.chiiPersonCollects.uid, schema.chiiUsers.id))
        .where(condition)
        .orderBy(op.desc(schema.chiiPersonCollects.createdAt))
        .limit(limit)
        .offset(offset)
        .execute();
      const users = data.map((d) => toPersonCollect(d.chii_members, d.chii_person_collects));
      return {
        total: count,
        data: users,
      };
    },
  );
}
