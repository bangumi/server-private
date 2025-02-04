import { Type as t } from '@sinclair/typebox';

import { db, op } from '@app/drizzle/db.ts';
import * as schema from '@app/drizzle/schema';
import { Security, Tag } from '@app/lib/openapi/index.ts';
import { PersonType } from '@app/lib/subject/type.ts';
import * as convert from '@app/lib/types/convert.ts';
import * as req from '@app/lib/types/req.ts';
import * as res from '@app/lib/types/res.ts';
import { requireLogin } from '@app/routes/hooks/pre-handler.ts';
import type { App } from '@app/routes/type.ts';

// eslint-disable-next-line @typescript-eslint/require-await
export async function setup(app: App) {
  app.get(
    '/collections/subjects',
    {
      schema: {
        summary: '获取当前用户的条目收藏',
        operationId: 'getMySubjectCollections',
        tags: [Tag.Collection],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        querystring: t.Object({
          subjectType: t.Optional(req.Ref(req.SubjectType)),
          type: t.Optional(req.Ref(req.CollectionType)),
          since: t.Optional(t.Integer({ minimum: 0, description: '起始时间戳' })),
          limit: t.Optional(
            t.Integer({ default: 20, minimum: 1, maximum: 100, description: 'max 100' }),
          ),
          offset: t.Optional(t.Integer({ default: 0, minimum: 0, description: 'min 0' })),
        }),
        response: {
          200: res.Paged(res.Ref(res.Subject)),
        },
      },
      preHandler: [requireLogin('get my subject collections')],
    },
    async ({ auth, query: { subjectType, type, since, limit = 20, offset = 0 } }) => {
      const conditions = op.and(
        op.eq(schema.chiiSubjectInterests.uid, auth.userID),
        subjectType ? op.eq(schema.chiiSubjectInterests.subjectType, subjectType) : undefined,
        type
          ? op.eq(schema.chiiSubjectInterests.type, type)
          : op.ne(schema.chiiSubjectInterests.type, 0),
        since ? op.gte(schema.chiiSubjectInterests.updatedAt, since) : undefined,
        op.ne(schema.chiiSubjects.ban, 1),
        op.eq(schema.chiiSubjectFields.redirect, 0),
        auth.allowNsfw ? undefined : op.eq(schema.chiiSubjects.nsfw, false),
      );

      const [{ count = 0 } = {}] = await db
        .select({ count: op.count() })
        .from(schema.chiiSubjectInterests)
        .innerJoin(
          schema.chiiSubjects,
          op.eq(schema.chiiSubjectInterests.subjectID, schema.chiiSubjects.id),
        )
        .innerJoin(
          schema.chiiSubjectFields,
          op.eq(schema.chiiSubjects.id, schema.chiiSubjectFields.id),
        )
        .where(conditions);

      const data = await db
        .select()
        .from(schema.chiiSubjectInterests)
        .innerJoin(
          schema.chiiSubjects,
          op.eq(schema.chiiSubjectInterests.subjectID, schema.chiiSubjects.id),
        )
        .innerJoin(
          schema.chiiSubjectFields,
          op.eq(schema.chiiSubjects.id, schema.chiiSubjectFields.id),
        )
        .where(conditions)
        .orderBy(op.desc(schema.chiiSubjectInterests.updatedAt))
        .limit(limit)
        .offset(offset);

      const collections = data.map((d) => {
        const interest = convert.toSubjectInterest(d.chii_subject_interests);
        const subject = convert.toSubject(d.chii_subjects, d.chii_subject_fields);
        return {
          ...subject,
          interest,
        };
      });

      return {
        data: collections,
        total: count,
      };
    },
  );

  app.get(
    '/collections/characters',
    {
      schema: {
        summary: '获取当前用户的角色收藏',
        operationId: 'getMyCharacterCollections',
        tags: [Tag.Collection],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        querystring: t.Object({
          limit: t.Optional(
            t.Integer({ default: 20, minimum: 1, maximum: 100, description: 'max 100' }),
          ),
          offset: t.Optional(t.Integer({ default: 0, minimum: 0, description: 'min 0' })),
        }),
        response: {
          200: res.Paged(res.Ref(res.Character)),
        },
      },
      preHandler: [requireLogin('get my character collections')],
    },
    async ({ auth, query: { limit = 20, offset = 0 } }) => {
      const conditions = op.and(
        op.eq(schema.chiiPersonCollects.cat, PersonType.Character),
        op.eq(schema.chiiPersonCollects.uid, auth.userID),
        op.ne(schema.chiiCharacters.ban, 1),
        op.eq(schema.chiiCharacters.redirect, 0),
        auth.allowNsfw ? undefined : op.eq(schema.chiiCharacters.nsfw, false),
      );

      const [{ count = 0 } = {}] = await db
        .select({ count: op.count() })
        .from(schema.chiiPersonCollects)
        .innerJoin(
          schema.chiiCharacters,
          op.eq(schema.chiiPersonCollects.mid, schema.chiiCharacters.id),
        )
        .where(conditions);

      const data = await db
        .select()
        .from(schema.chiiPersonCollects)
        .innerJoin(
          schema.chiiCharacters,
          op.eq(schema.chiiPersonCollects.mid, schema.chiiCharacters.id),
        )
        .where(conditions)
        .orderBy(op.desc(schema.chiiPersonCollects.createdAt))
        .limit(limit)
        .offset(offset);
      const collection = data.map((d) => {
        const character = convert.toCharacter(d.chii_characters);
        return {
          ...character,
          collectedAt: d.chii_person_collects.createdAt,
        };
      });

      return {
        data: collection,
        total: count,
      };
    },
  );

  app.get(
    '/collections/persons',
    {
      schema: {
        summary: '获取当前用户的人物收藏',
        operationId: 'getMyPersonCollections',
        tags: [Tag.Collection],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        querystring: t.Object({
          limit: t.Optional(
            t.Integer({ default: 20, minimum: 1, maximum: 100, description: 'max 100' }),
          ),
          offset: t.Optional(t.Integer({ default: 0, minimum: 0, description: 'min 0' })),
        }),
        response: {
          200: res.Paged(res.Ref(res.Person)),
        },
      },
      preHandler: [requireLogin('get my person collections')],
    },
    async ({ auth, query: { limit = 20, offset = 0 } }) => {
      const conditions = op.and(
        op.eq(schema.chiiPersonCollects.cat, PersonType.Person),
        op.eq(schema.chiiPersonCollects.uid, auth.userID),
        op.ne(schema.chiiPersons.ban, 1),
        op.eq(schema.chiiPersons.redirect, 0),
        auth.allowNsfw ? undefined : op.eq(schema.chiiPersons.nsfw, false),
      );

      const [{ count = 0 } = {}] = await db
        .select({ count: op.count() })
        .from(schema.chiiPersonCollects)
        .innerJoin(schema.chiiPersons, op.eq(schema.chiiPersonCollects.mid, schema.chiiPersons.id))
        .where(conditions);

      const data = await db
        .select()
        .from(schema.chiiPersonCollects)
        .innerJoin(schema.chiiPersons, op.eq(schema.chiiPersonCollects.mid, schema.chiiPersons.id))
        .where(conditions)
        .orderBy(op.desc(schema.chiiPersonCollects.createdAt))
        .limit(limit)
        .offset(offset);
      const collection = data.map((d) => {
        const person = convert.toPerson(d.chii_persons);
        return {
          ...person,
          collectedAt: d.chii_person_collects.createdAt,
        };
      });

      return {
        data: collection,
        total: count,
      };
    },
  );

  app.get(
    '/collections/indexes',
    {
      schema: {
        summary: '获取当前用户的目录收藏',
        operationId: 'getMyIndexCollections',
        tags: [Tag.Collection],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        querystring: t.Object({
          limit: t.Optional(
            t.Integer({ default: 20, minimum: 1, maximum: 100, description: 'max 100' }),
          ),
          offset: t.Optional(t.Integer({ default: 0, minimum: 0, description: 'min 0' })),
        }),
        response: {
          200: res.Paged(res.Ref(res.Index)),
        },
      },
      preHandler: [requireLogin('get my index collections')],
    },
    async ({ auth, query: { limit = 20, offset = 0 } }) => {
      const conditions = op.and(
        op.eq(schema.chiiIndexCollects.uid, auth.userID),
        op.ne(schema.chiiIndexes.ban, 1),
      );

      const [{ count = 0 } = {}] = await db
        .select({ count: op.count() })
        .from(schema.chiiIndexCollects)
        .innerJoin(schema.chiiIndexes, op.eq(schema.chiiIndexCollects.mid, schema.chiiIndexes.id))
        .where(conditions);

      const data = await db
        .select()
        .from(schema.chiiIndexCollects)
        .innerJoin(schema.chiiIndexes, op.eq(schema.chiiIndexCollects.mid, schema.chiiIndexes.id))
        .where(conditions)
        .orderBy(op.desc(schema.chiiIndexCollects.createdAt))
        .limit(limit)
        .offset(offset);
      const collection = data.map((d) => {
        const index = convert.toIndex(d.chii_index);
        return {
          ...index,
          collectedAt: d.chii_index_collects.createdAt,
        };
      });

      return {
        data: collection,
        total: count,
      };
    },
  );
}
