import { Type as t } from '@sinclair/typebox';

import { db, op } from '@app/drizzle/db.ts';
import type * as orm from '@app/drizzle/orm.ts';
import * as schema from '@app/drizzle/schema';
import { NotFoundError } from '@app/lib/error.ts';
import { Security, Tag } from '@app/lib/openapi/index.ts';
import * as convert from '@app/lib/types/convert.ts';
import * as fetcher from '@app/lib/types/fetcher.ts';
import * as req from '@app/lib/types/req.ts';
import * as res from '@app/lib/types/res.ts';
import { formatErrors } from '@app/lib/types/res.ts';
import type { App } from '@app/routes/type.ts';

function toCharacterSubject(
  subject: orm.ISubject,
  relation: orm.ICharacterSubject,
  actors: res.ISlimPerson[],
): res.ICharacterSubject {
  return {
    subject: convert.toSlimSubject(subject),
    actors: actors,
    type: relation.type,
  };
}

// eslint-disable-next-line @typescript-eslint/require-await
export async function setup(app: App) {
  app.get(
    '/characters/:characterID',
    {
      schema: {
        summary: '获取角色',
        operationId: 'getCharacter',
        tags: [Tag.Character],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          characterID: t.Integer(),
        }),
        response: {
          200: t.Ref(res.Character),
          404: t.Ref(res.Error, {
            'x-examples': formatErrors(new NotFoundError('character')),
          }),
        },
      },
    },
    async ({ auth, params: { characterID } }) => {
      const data = await db
        .select()
        .from(schema.chiiCharacters)
        .where(
          op.and(
            op.eq(schema.chiiCharacters.id, characterID),
            op.ne(schema.chiiCharacters.ban, 1),
            auth.allowNsfw ? undefined : op.eq(schema.chiiCharacters.nsfw, false),
          ),
        )
        .execute();
      for (const d of data) {
        return convert.toCharacter(d);
      }
      throw new NotFoundError(`character ${characterID}`);
    },
  );

  app.get(
    '/characters/:characterID/casts',
    {
      schema: {
        summary: '获取角色出演作品',
        operationId: 'getCharacterCasts',
        tags: [Tag.Character],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          characterID: t.Integer(),
        }),
        querystring: t.Object({
          subjectType: t.Optional(t.Ref(req.SubjectType)),
          type: t.Optional(t.Integer({ description: '角色出场类型: 主角，配角，客串' })),
          limit: t.Optional(
            t.Integer({ default: 20, minimum: 1, maximum: 100, description: 'max 100' }),
          ),
          offset: t.Optional(t.Integer({ default: 0, minimum: 0, description: 'min 0' })),
        }),
        response: {
          200: res.Paged(t.Ref(res.CharacterSubject)),
          404: t.Ref(res.Error, {
            'x-examples': formatErrors(new NotFoundError('character')),
          }),
        },
      },
    },
    async ({
      auth,
      params: { characterID },
      query: { subjectType, type, limit = 20, offset = 0 },
    }) => {
      const character = await fetcher.fetchSlimCharacterByID(characterID, auth.allowNsfw);
      if (!character) {
        throw new NotFoundError(`character ${characterID}`);
      }
      const condition = op.and(
        op.eq(schema.chiiCharacterSubjects.characterID, characterID),
        subjectType ? op.eq(schema.chiiCharacterSubjects.subjectType, subjectType) : undefined,
        type ? op.eq(schema.chiiCharacterSubjects.type, type) : undefined,
        op.ne(schema.chiiSubjects.ban, 1),
        auth.allowNsfw ? undefined : op.eq(schema.chiiSubjects.nsfw, false),
      );
      const [{ count = 0 } = {}] = await db
        .select({ count: op.count() })
        .from(schema.chiiCharacterSubjects)
        .innerJoin(
          schema.chiiSubjects,
          op.eq(schema.chiiCharacterSubjects.subjectID, schema.chiiSubjects.id),
        )
        .where(condition)
        .execute();
      const data = await db
        .select()
        .from(schema.chiiCharacterSubjects)
        .innerJoin(
          schema.chiiSubjects,
          op.eq(schema.chiiCharacterSubjects.subjectID, schema.chiiSubjects.id),
        )
        .where(condition)
        .orderBy(
          op.asc(schema.chiiCharacterSubjects.type),
          op.asc(schema.chiiCharacterSubjects.order),
        )
        .limit(limit)
        .offset(offset)
        .execute();
      const subjectIDs = data.map((d) => d.chii_subjects.id);
      const casts = await fetcher.fetchCastsByCharacterAndSubjectIDs(
        characterID,
        subjectIDs,
        auth.allowNsfw,
      );
      const subjects = data.map((d) =>
        toCharacterSubject(
          d.chii_subjects,
          d.chii_crt_subject_index,
          casts[d.chii_subjects.id] || [],
        ),
      );
      return {
        data: subjects,
        total: count,
      };
    },
  );

  app.get(
    '/characters/:characterID/collects',
    {
      schema: {
        summary: '获取角色的收藏用户',
        operationId: 'getCharacterCollects',
        tags: [Tag.Character],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          characterID: t.Integer(),
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
            'x-examples': formatErrors(new NotFoundError('character')),
          }),
        },
      },
    },
    async ({ auth, params: { characterID }, query: { limit = 20, offset = 0 } }) => {
      const character = await fetcher.fetchSlimCharacterByID(characterID, auth.allowNsfw);
      if (!character) {
        throw new NotFoundError(`character ${characterID}`);
      }
      const condition = op.and(
        op.eq(schema.chiiPersonCollects.cat, 'crt'),
        op.eq(schema.chiiPersonCollects.mid, characterID),
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
