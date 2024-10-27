import type { Static } from '@sinclair/typebox';
import { Type as t } from '@sinclair/typebox';

import { db, op } from '@app/drizzle/db.ts';
import type * as orm from '@app/drizzle/orm.ts';
import * as schema from '@app/drizzle/schema';
import { NotFoundError } from '@app/lib/error.ts';
import { Security, Tag } from '@app/lib/openapi/index.ts';
import { SubjectType } from '@app/lib/subject/type.ts';
import * as convert from '@app/lib/types/convert.ts';
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

// eslint-disable-next-line @typescript-eslint/require-await
export async function setup(app: App) {
  app.addSchema(SubjectRelation);

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
    async ({ auth, params: { subjectID }, query: { type, limit = 20, offset = 0 } }) => {
      const condition = op.and(
        op.eq(schema.chiiSubjectRelations.id, subjectID),
        type ? op.eq(schema.chiiSubjectRelations.relatedType, type) : undefined,
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
}
