import { Type as t } from '@sinclair/typebox';

import { db, op } from '@app/drizzle/db.ts';
import * as schema from '@app/drizzle/schema';
import { NotFoundError } from '@app/lib/error.ts';
import { IndexRelatedCategory } from '@app/lib/index/types.ts';
import { Security, Tag } from '@app/lib/openapi/index.ts';
import * as convert from '@app/lib/types/convert.ts';
import * as fetcher from '@app/lib/types/fetcher.ts';
import * as req from '@app/lib/types/req.ts';
import * as res from '@app/lib/types/res.ts';
import type { App } from '@app/routes/type.ts';

// eslint-disable-next-line @typescript-eslint/require-await
export async function setup(app: App) {
  app.get(
    '/indexes/:indexID',
    {
      schema: {
        summary: '获取目录详情',
        operationId: 'getIndex',
        tags: [Tag.Index],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          indexID: t.Integer(),
        }),
        response: {
          200: res.Ref(res.Index),
        },
      },
    },
    async ({ params: { indexID } }) => {
      const [data] = await db
        .select()
        .from(schema.chiiIndexes)
        .innerJoin(schema.chiiUsers, op.eq(schema.chiiIndexes.uid, schema.chiiUsers.id))
        .where(op.eq(schema.chiiIndexes.id, indexID));
      if (!data) {
        throw new NotFoundError('index');
      }
      const index = convert.toIndex(data.chii_index, data.chii_members);
      return index;
    },
  );

  app.get(
    '/indexes/:indexID/related',
    {
      schema: {
        summary: '获取目录的关联内容',
        operationId: 'getIndexRelated',
        tags: [Tag.Index],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          indexID: t.Integer(),
        }),
        querystring: t.Object({
          cat: t.Optional(req.Ref(req.IndexRelatedCategory)),
          type: t.Optional(req.Ref(req.SubjectType)),
          limit: t.Optional(
            t.Integer({ default: 20, minimum: 1, maximum: 100, description: 'max 100' }),
          ),
          offset: t.Optional(t.Integer({ default: 0, minimum: 0, description: 'min 0' })),
        }),
        response: {
          200: res.Paged(res.Ref(res.IndexRelated)),
        },
      },
    },
    async ({ params: { indexID }, query: { cat, type, limit = 20, offset = 0 } }) => {
      const index = await fetcher.fetchSlimIndexByID(indexID);
      if (!index) {
        throw new NotFoundError('index');
      }

      const conditions = [
        op.eq(schema.chiiIndexRelated.rid, indexID),
        op.eq(schema.chiiIndexRelated.cat, IndexRelatedCategory.Subject),
        op.eq(schema.chiiIndexRelated.ban, 0),
      ];
      if (cat) {
        conditions.push(op.eq(schema.chiiIndexRelated.cat, cat));
      }
      if (type) {
        conditions.push(op.eq(schema.chiiIndexRelated.type, type));
      }

      const [{ count = 0 } = {}] = await db
        .select({ count: op.count() })
        .from(schema.chiiIndexRelated)
        .where(op.and(...conditions));

      const data = await db
        .select()
        .from(schema.chiiIndexRelated)
        .where(op.and(...conditions))
        .orderBy(op.asc(schema.chiiIndexRelated.order), op.asc(schema.chiiIndexRelated.id))
        .limit(limit)
        .offset(offset);
      const items = data.map((item) => convert.toIndexRelated(item));

      const subjectIDs = items
        .filter((item) => item.cat === IndexRelatedCategory.Subject)
        .map((item) => item.sid);
      const subjects = await fetcher.fetchSlimSubjectsByIDs(subjectIDs);

      const characterIDs = items
        .filter((item) => item.cat === IndexRelatedCategory.Character)
        .map((item) => item.sid);
      const characters = await fetcher.fetchSlimCharactersByIDs(characterIDs);

      const personIDs = items
        .filter((item) => item.cat === IndexRelatedCategory.Person)
        .map((item) => item.sid);
      const persons = await fetcher.fetchSlimPersonsByIDs(personIDs);

      const episodeIDs = items
        .filter((item) => item.cat === IndexRelatedCategory.Ep)
        .map((item) => item.sid);
      const episodes = await fetcher.fetchSlimEpisodesByIDs(episodeIDs);

      const result = [];
      for (const item of items) {
        switch (item.cat) {
          case IndexRelatedCategory.Subject: {
            item.subject = subjects[item.sid];
            break;
          }
          case IndexRelatedCategory.Character: {
            item.character = characters[item.sid];
            break;
          }
          case IndexRelatedCategory.Person: {
            item.person = persons[item.sid];
            break;
          }
          case IndexRelatedCategory.Ep: {
            item.episode = episodes[item.sid];
            break;
          }
        }
        result.push(item);
      }
      return {
        data: result,
        total: count,
      };
    },
  );
}
