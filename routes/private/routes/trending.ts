import type { Static } from 'typebox';
import t from 'typebox';

import { db, op, schema } from '@app/drizzle';
import { Security, Tag } from '@app/lib/openapi/index.ts';
import redis from '@app/lib/redis';
import { TopicDisplay } from '@app/lib/topic/type.ts';
import { getTrendingSubjectKey } from '@app/lib/trending/cache.ts';
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

export type IChannelSubjectTopic = Static<typeof ChannelSubjectTopic>;
const ChannelSubjectTopic = t.Object(
  {
    id: t.Integer(),
    title: t.String(),
    replyCount: t.Integer(),
    updatedAt: t.Integer({ description: '最后回复时间，unix time stamp in seconds' }),
    creator: t.Optional(res.Ref(res.SlimUser)),
    subject: res.Ref(res.SlimSubject),
  },
  { $id: 'ChannelSubjectTopic', title: 'ChannelSubjectTopic' },
);

// eslint-disable-next-line @typescript-eslint/require-await
export async function setup(app: App) {
  app.addSchema(TrendingSubject);
  app.addSchema(ChannelSubjectTopic);

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
        summary: '获取条目讨论',
        operationId: 'getTrendingSubjectTopics',
        tags: [Tag.Trending],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        querystring: t.Object({
          type: t.Optional(req.Ref(req.SubjectType)),
          limit: t.Optional(
            t.Integer({ default: 20, minimum: 1, maximum: 100, description: 'max 100' }),
          ),
          offset: t.Optional(t.Integer({ default: 0, minimum: 0, description: 'min 0' })),
        }),
        response: {
          200: res.Paged(res.Ref(ChannelSubjectTopic)),
        },
      },
    },
    async ({ auth, query: { type, limit = 20, offset = 0 } }) => {
      const conditions = [
        op.eq(schema.chiiSubjectTopics.display, TopicDisplay.Normal),
        op.ne(schema.chiiSubjects.ban, 1),
        auth.allowNsfw ? undefined : op.eq(schema.chiiSubjects.nsfw, false),
      ];
      if (type !== undefined) {
        conditions.push(op.eq(schema.chiiSubjects.typeID, type));
      }
      const [{ count = 0 } = {}] = await db
        .select({ count: op.count() })
        .from(schema.chiiSubjectTopics)
        .innerJoin(
          schema.chiiSubjects,
          op.eq(schema.chiiSubjectTopics.subjectID, schema.chiiSubjects.id),
        )
        .where(op.and(...conditions));
      const data = await db
        .select()
        .from(schema.chiiSubjectTopics)
        .innerJoin(
          schema.chiiSubjects,
          op.eq(schema.chiiSubjectTopics.subjectID, schema.chiiSubjects.id),
        )
        .where(op.and(...conditions))
        .orderBy(op.desc(schema.chiiSubjectTopics.updatedAt))
        .limit(limit)
        .offset(offset);
      const users = await fetcher.fetchSlimUsersByIDs(data.map((d) => d.chii_subject_topics.uid));
      const subjects = await fetcher.fetchSlimSubjectsByIDs(
        data.map((d) => d.chii_subject_topics.subjectID),
        auth.allowNsfw,
      );
      const result: IChannelSubjectTopic[] = [];
      for (const d of data) {
        const topic = d.chii_subject_topics;
        const subject = subjects[topic.subjectID];
        if (!subject) {
          continue;
        }
        const item: IChannelSubjectTopic = {
          id: topic.id,
          title: topic.title,
          replyCount: topic.replies,
          updatedAt: topic.updatedAt,
          subject,
        };
        const creator = users[topic.uid];
        if (creator) {
          item.creator = creator;
        }
        result.push(item);
      }
      return { data: result, total: count };
    },
  );
}
