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

function toPersonWork(subject: orm.ISubject, relations: orm.IPersonSubject[]): res.IPersonWork {
  return {
    subject: convert.toSlimSubject(subject),
    positions: relations.map((r) => convert.toSubjectStaffPosition(r)),
  };
}

function toPersonCharacter(
  character: orm.ICharacter,
  relations: res.ICharacterSubjectRelation[],
): res.IPersonCharacter {
  return {
    character: convert.toSlimCharacter(character),
    relations: relations,
  };
}

// eslint-disable-next-line @typescript-eslint/require-await
export async function setup(app: App) {
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
            op.ne(schema.chiiPersons.ban, 1),
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
    '/persons/:personID/works',
    {
      schema: {
        summary: '获取人物的参与作品',
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
          200: res.Paged(t.Ref(res.PersonWork)),
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
        op.ne(schema.chiiSubjects.ban, 1),
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
        .groupBy(schema.chiiPersonSubjects.subjectID)
        .execute();
      const data = await db
        .select()
        .from(schema.chiiPersonSubjects)
        .innerJoin(
          schema.chiiSubjects,
          op.eq(schema.chiiPersonSubjects.subjectID, schema.chiiSubjects.id),
        )
        .where(condition)
        .groupBy(schema.chiiPersonSubjects.subjectID)
        .orderBy(op.desc(schema.chiiPersonSubjects.subjectID))
        .limit(limit)
        .offset(offset)
        .execute();
      const subjectIDs = data.map((d) => d.chii_person_cs_index.subjectID);
      const relations = await db
        .select()
        .from(schema.chiiPersonSubjects)
        .where(
          op.and(
            op.inArray(schema.chiiPersonSubjects.subjectID, subjectIDs),
            op.eq(schema.chiiPersonSubjects.personID, personID),
            position ? op.eq(schema.chiiPersonSubjects.position, position) : undefined,
          ),
        )
        .execute();
      const relationsMap = new Map<number, orm.IPersonSubject[]>();
      for (const r of relations) {
        const relations = relationsMap.get(r.subjectID) || [];
        relations.push(r);
        relationsMap.set(r.subjectID, relations);
      }
      const subjects = data.map((d) =>
        toPersonWork(d.chii_subjects, relationsMap.get(d.chii_subjects.id) || []),
      );
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
        summary: '获取人物的出演角色',
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
          200: res.Paged(t.Ref(res.PersonCharacter)),
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
        op.ne(schema.chiiCharacters.ban, 1),
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
          200: res.Paged(t.Ref(res.PersonCollect)),
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
      const users = data.map((d) =>
        convert.toPersonCollect(d.chii_members, d.chii_person_collects),
      );
      return {
        total: count,
        data: users,
      };
    },
  );
}
