import type { Static } from 'typebox';
import t from 'typebox';

import { db, op, schema } from '@app/drizzle';
import { Tag } from '@app/lib/openapi/index.ts';
import { RevType } from '@app/lib/rev/type.ts';
import * as res from '@app/lib/types/res.ts';
import type { App } from '@app/routes/type.ts';

import * as character from './character/index.ts';
import * as person from './person/index.ts';
import * as ep from './subject/ep.ts';
import * as subject from './subject/index.ts';

export async function setup(app: App) {
  await app.register(subject.setup);
  await app.register(character.setup);
  await app.register(person.setup);
  await app.register(ep.setup);
  await app.register(setupRecentChangeList);
}

// eslint-disable-next-line @typescript-eslint/require-await
export async function setupRecentChangeList(app: App) {
  const RecentWikiChange = t.Object(
    {
      subject: t.Array(t.Object({ id: t.Integer(), createdAt: t.Integer() })),
      persons: t.Array(t.Object({ id: t.Integer(), createdAt: t.Integer() })),
    },
    { $id: 'RecentWikiChange' },
  );

  const RecentItem = t.Array(t.Object({ id: t.Integer(), createdAt: t.Integer() }));

  const sinceParam = t.Object({
    since: t.Integer({
      default: 0,
      description:
        'unix time stamp, only return last update time >= since\n\nonly allow recent 2 days',
    }),
  });

  app.addSchema(RecentWikiChange);

  app.get(
    '/recent/subjects',
    {
      schema: {
        tags: [Tag.Wiki],
        operationId: 'getRecentSubjectWiki',
        description: '获取最近两天的wiki更新',
        params: t.Object({
          since: t.Integer({
            default: 0,
            description:
              'unix time stamp, only return last update time >= since\n\nonly allow recent 2 days',
          }),
        }),
        response: {
          200: res.Ref(RecentWikiChange),
          401: res.Ref(res.Error),
        },
      },
    },
    async ({ params: { since } }): Promise<Static<typeof RecentWikiChange>> => {
      since = Math.max(Date.now() / 1000 - 3600 * 24 * 2, since);

      const subjects = await db
        .select({
          subjectID: schema.chiiSubjectRev.subjectID,
          createdAt: schema.chiiSubjectRev.createdAt,
        })
        .from(schema.chiiSubjectRev)
        .where(op.gte(schema.chiiSubjectRev.createdAt, since))
        .orderBy(op.desc(schema.chiiSubjectRev.createdAt));

      const persons = await db
        .select({
          revMid: schema.chiiRevHistory.revMid,
          createdAt: schema.chiiRevHistory.createdAt,
        })
        .from(schema.chiiRevHistory)
        .where(
          op.and(
            op.gte(schema.chiiRevHistory.createdAt, since),
            op.inArray(schema.chiiRevHistory.revType, [
              RevType.personEdit,
              RevType.personMerge,
              RevType.personErase,
            ]),
          ),
        )
        .orderBy(op.desc(schema.chiiRevHistory.createdAt));

      return {
        subject: subjects.map((o) => {
          return { id: o.subjectID, createdAt: o.createdAt };
        }),
        persons: persons.map((o) => {
          return { id: o.revMid, createdAt: o.createdAt };
        }),
      };
    },
  );

  app.get(
    '/recent/persons',
    {
      schema: {
        tags: [Tag.Wiki],
        operationId: 'getRecentPersonWiki',
        description: '获取最近两天的人物wiki更新',
        params: sinceParam,
        response: {
          200: RecentItem,
          401: res.Ref(res.Error),
        },
      },
    },
    async ({ params: { since } }): Promise<Static<typeof RecentItem>> => {
      since = Math.max(Date.now() / 1000 - 3600 * 24 * 2, since);

      const persons = await db
        .select({
          revMid: schema.chiiRevHistory.revMid,
          createdAt: schema.chiiRevHistory.createdAt,
        })
        .from(schema.chiiRevHistory)
        .where(
          op.and(
            op.gte(schema.chiiRevHistory.createdAt, since),
            op.inArray(schema.chiiRevHistory.revType, [
              RevType.personEdit,
              RevType.personMerge,
              RevType.personErase,
            ]),
          ),
        )
        .orderBy(op.desc(schema.chiiRevHistory.createdAt));

      return persons.map((o) => {
        return { id: o.revMid, createdAt: o.createdAt };
      });
    },
  );

  app.get(
    '/recent/characters',
    {
      schema: {
        tags: [Tag.Wiki],
        operationId: 'getRecentCharacterWiki',
        description: '获取最近两天的角色wiki更新',
        params: sinceParam,
        response: {
          200: RecentItem,
          401: res.Ref(res.Error),
        },
      },
    },
    async ({ params: { since } }): Promise<Static<typeof RecentItem>> => {
      since = Math.max(Date.now() / 1000 - 3600 * 24 * 2, since);

      const characters = await db
        .select({
          revMid: schema.chiiRevHistory.revMid,
          createdAt: schema.chiiRevHistory.createdAt,
        })
        .from(schema.chiiRevHistory)
        .where(
          op.and(
            op.gte(schema.chiiRevHistory.createdAt, since),
            op.inArray(schema.chiiRevHistory.revType, [
              RevType.characterEdit,
              RevType.characterMerge,
              RevType.characterErase,
            ]),
          ),
        )
        .orderBy(op.desc(schema.chiiRevHistory.createdAt));

      return characters.map((o) => {
        return { id: o.revMid, createdAt: o.createdAt };
      });
    },
  );

  app.get(
    '/recent/episodes',
    {
      schema: {
        tags: [Tag.Wiki],
        operationId: 'getRecentEpisodeWiki',
        description: '获取最近两天的章节wiki更新',
        params: sinceParam,
        response: {
          200: RecentItem,
          401: res.Ref(res.Error),
        },
      },
    },
    async ({ params: { since } }): Promise<Static<typeof RecentItem>> => {
      since = Math.max(Date.now() / 1000 - 3600 * 24 * 2, since);

      const episodes = await db
        .select({
          revSid: schema.chiiEpRevisions.revSid,
          revDateline: schema.chiiEpRevisions.revDateline,
        })
        .from(schema.chiiEpRevisions)
        .where(op.gte(schema.chiiEpRevisions.revDateline, since))
        .orderBy(op.desc(schema.chiiEpRevisions.revDateline));

      return episodes.map((o) => {
        return { id: o.revSid, createdAt: o.revDateline };
      });
    },
  );
}
