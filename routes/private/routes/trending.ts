import type { Static } from '@sinclair/typebox';
import { Type as t } from '@sinclair/typebox';

import { Security, Tag } from '@app/lib/openapi/index.ts';
import redis from '@app/lib/redis';
import { SubjectType } from '@app/lib/subject/type.ts';
import { getSubjectTrendingKey } from '@app/lib/trending/subject.ts';
import { type TrendingItem, TrendingPeriod } from '@app/lib/trending/type';
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
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        querystring: t.Object({
          type: t.Enum(SubjectType, { description: '条目类型' }),
          limit: t.Optional(
            t.Integer({ default: 20, minimum: 1, maximum: 100, description: 'max 100' }),
          ),
          offset: t.Optional(
            t.Integer({ default: 0, minimum: 0, maximum: 1000, description: 'min 0, max 1000' }),
          ),
        }),
        response: {
          200: t.Array(t.Ref(TrendingSubject)),
        },
      },
    },
    async ({ auth, query: { type, limit = 20, offset = 0 } }) => {
      const cacheKey = getSubjectTrendingKey(type, TrendingPeriod.Month);
      const cached = await redis.get(cacheKey);
      if (!cached) {
        return [];
      }
      const ids = JSON.parse(cached) as TrendingItem[];
      const items = ids.slice(offset, offset + limit);
      const subjects = await fetcher.fetchSubjectsByIDs(
        items.map((item) => item.id),
        auth.allowNsfw,
      );
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
      return data;
    },
  );
}
