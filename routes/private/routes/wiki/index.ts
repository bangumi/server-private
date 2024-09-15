import type { Static } from '@sinclair/typebox';
import { Type as t } from '@sinclair/typebox';

import { Tag } from '@app/lib/openapi/index.ts';
import * as orm from '@app/lib/orm/index.ts';
import * as res from '@app/lib/types/res.ts';
import type { App } from '@app/routes/type.ts';

import * as ep from './subject/ep.ts';
import * as subject from './subject/index.ts';

// eslint-disable-next-line @typescript-eslint/require-await
export async function setup(app: App) {
  await app.register(subject.setup);
  await app.register(ep.setup);
  await app.register(setupRecentChangeList);
}

// eslint-disable-next-line @typescript-eslint/require-await
export async function setupRecentChangeList(app: App) {
  const RecentWikiChange = t.Object(
    {
      subject: t.Array(t.Any({})),
    },
    { $id: 'RecentWikiChange' },
  );

  app.addSchema(RecentWikiChange);
  app.addSchema(res.Error);

  app.get(
    '/recent',
    {
      schema: {
        tags: [Tag.Wiki],
        operationId: 'getRecentWiki',
        description: '获取最近两天的wiki更新',
        response: {
          200: t.Ref(RecentWikiChange),
          401: t.Ref(res.Error),
        },
      },
    },
    async (): Promise<Static<typeof RecentWikiChange>> => {
      const subjects = await orm.SubjectRevRepo.find({
        select: ['subjectID', 'createdAt', 'commitMessage'],
        where: {
          createdAt: orm.Gt(Date.now() / 1000 - 3600 * 24 * 2),
        },
        order: {
          createdAt: 'DESC',
        },
      });
      return {
        subject: subjects,
      };
    },
  );
}
