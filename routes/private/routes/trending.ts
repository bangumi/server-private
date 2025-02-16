import type { Static } from '@sinclair/typebox';
import { Type as t } from '@sinclair/typebox';

import { Security, Tag } from '@app/lib/openapi/index.ts';
import redis from '@app/lib/redis';
import { getTrendingSubjectKey, getTrendingSubjectTopicKey } from '@app/lib/trending/cache.ts';
import { type TrendingItem, TrendingPeriod } from '@app/lib/trending/type';
import * as fetcher from '@app/lib/types/fetcher.ts';
import * as req from '@app/lib/types/req.ts';
import * as res from '@app/lib/types/res.ts';
import type { App } from '@app/routes/type.ts';

export type ITrendingSubject = Static<typeof TrendingSubject>;
const TrendingSubject = t.Object(
  {
    subject: res.Ref(res.SlimSubject),
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
          type: req.Ref(req.SubjectType),
          limit: t.Optional(
            t.Integer({ default: 20, minimum: 1, maximum: 100, description: 'max 100' }),
          ),
          offset: t.Optional(t.Integer({ default: 0, minimum: 0, description: 'min 0' })),
        }),
        response: {
          200: res.Paged(res.Ref(TrendingSubject)),
        },
      },
    },
    async ({ auth, query: { type, limit = 20, offset = 0 } }) => {
      const cacheKey = getTrendingSubjectKey(type, TrendingPeriod.Month);
      const cached = await redis.get(cacheKey);
      if (!cached) {
        return { data: [], total: 0 };
      }
      const ids = JSON.parse(cached) as TrendingItem[];
      const items = ids.slice(offset, offset + limit);
      const subjects = await fetcher.fetchSlimSubjectsByIDs(
        items.map((item) => item.id),
        auth.allowNsfw,
      );
      const data = [];
      for (const item of items) {
        const subject = subjects[item.id];
        if (subject) {
          data.push({
            subject,
            count: item.total,
          });
        }
      }
      return { data, total: ids.length };
    },
  );

  app.get(
    '/trending/subjects/topics',
    {
      schema: {
        summary: '获取热门条目讨论',
        operationId: 'getTrendingSubjectTopics',
        tags: [Tag.Trending],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        querystring: t.Object({
          limit: t.Optional(
            t.Integer({ default: 20, minimum: 1, maximum: 100, description: 'max 100' }),
          ),
          offset: t.Optional(t.Integer({ default: 0, minimum: 0, description: 'min 0' })),
        }),
        response: {
          200: res.Paged(res.Ref(res.SubjectTopic)),
        },
      },
    },
    async ({ auth, query: { limit = 20, offset = 0 } }) => {
      const cacheKey = getTrendingSubjectTopicKey(TrendingPeriod.Week);
      const cached = await redis.get(cacheKey);
      if (!cached) {
        return { data: [], total: 0 };
      }
      const ids = JSON.parse(cached) as TrendingItem[];
      const items = ids.slice(offset, offset + limit);
      const topics = await fetcher.fetchSubjectTopicsByIDs(items.map((item) => item.id));
      const subjects = await fetcher.fetchSlimSubjectsByIDs(
        Object.values(topics).map((topic) => topic.parentID),
        auth.allowNsfw,
      );
      const users = await fetcher.fetchSlimUsersByIDs(
        Object.values(topics).map((topic) => topic.creatorID),
      );
      const data = [];
      for (const item of items) {
        const topic = topics[item.id];
        if (!topic) {
          continue;
        }
        const subject = subjects[topic.parentID];
        if (!subject) {
          continue;
        }
        const creator = users[topic.creatorID];
        if (!creator) {
          continue;
        }
        data.push({
          ...topic,
          subject,
          creator,
          replies: [],
        });
      }
      return { data, total: ids.length };
    },
  );
}
