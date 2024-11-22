import type { Static } from '@sinclair/typebox';
import { Type as t } from '@sinclair/typebox';

import { Tag } from '@app/lib/openapi/index.ts';
import { SubjectType } from '@app/lib/subject/type.ts';
import { getTrendingSubjects } from '@app/lib/trending/subject.ts';
import { TrendingPeriod } from '@app/lib/trending/type';
import * as fetcher from '@app/lib/types/fetcher.ts';
import * as res from '@app/lib/types/res.ts';
import type { App } from '@app/routes/type.ts';

export type ITrendingSubject = Static<typeof TrendingSubject>;
const TrendingSubject = t.Object(
  {
    subject: t.Ref(res.Subject),
    count: t.Integer(),
  },
  { $id: 'TrendingSubject' },
);

// eslint-disable-next-line @typescript-eslint/require-await
export async function setup(app: App) {
  app.addSchema(TrendingSubject);

  app.get(
    '/trending/subjects',
    {
      schema: {
        summary: '获取热门条目',
        operationId: 'getTrendingSubjects',
        tags: [Tag.Trending],
        querystring: t.Object({
          type: t.Enum(SubjectType, { description: '条目类型' }),
          limit: t.Optional(
            t.Integer({ default: 20, minimum: 1, maximum: 100, description: 'max 100' }),
          ),
          offset: t.Optional(t.Integer({ default: 0, minimum: 0, description: 'min 0' })),
        }),
        response: {
          200: res.Paged(t.Ref(TrendingSubject)),
        },
      },
    },
    async ({ query: { type, limit = 20, offset = 0 } }) => {
      const items = await getTrendingSubjects(type, TrendingPeriod.Month, limit, offset);
      const subjectIDs = items.map((item) => item.id);
      const subjects = await fetcher.fetchSubjectsByIDs(subjectIDs);
      const data = [];
      for (const item of items) {
        const subject = subjects.get(item.id);
        if (subject) {
          data.push({
            subject,
            count: item.total,
          });
        }
      }
      return {
        total: 1000,
        data,
      };
    },
  );
}
