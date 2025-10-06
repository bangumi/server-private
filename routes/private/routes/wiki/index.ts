import type { Static } from 'typebox';
import t from 'typebox';

import { Tag } from '@app/lib/openapi/index.ts';
import { RevType } from '@app/lib/orm/entity/index.ts';
import * as orm from '@app/lib/orm/index.ts';
import * as res from '@app/lib/types/res.ts';
import type { App } from '@app/routes/type.ts';

import * as person from './person/index.ts';
import * as ep from './subject/ep.ts';
import * as subject from './subject/index.ts';

export async function setup(app: App) {
  await app.register(subject.setup);
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

  app.addSchema(RecentWikiChange);

  app.get(
    '/recent',
    {
      schema: {
        tags: [Tag.Wiki],
        operationId: 'getRecentWiki',
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

      const subjects = await orm.SubjectRevRepo.find({
        select: ['subjectID', 'createdAt', 'commitMessage'],
        where: {
          createdAt: orm.Gte(since),
        },
        order: {
          createdAt: 'DESC',
        },
      });

      const persons = await orm.RevHistoryRepo.find({
        select: ['revMid', 'createdAt'],
        where: {
          createdAt: orm.Gte(since),
          revType: orm.In([RevType.personEdit, RevType.personMerge, RevType.personErase]),
        },
        order: {
          createdAt: 'DESC',
        },
      });

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
}
