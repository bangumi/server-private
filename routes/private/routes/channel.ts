import type { Static } from 'typebox';
import t from 'typebox';

import { db, op, schema } from '@app/drizzle';
import { TypedCache } from '@app/lib/cache.ts';
import { UnreachableError } from '@app/lib/error.ts';
import { Security, Tag } from '@app/lib/openapi/index.ts';
import { SubjectType } from '@app/lib/subject/type.ts';
import { TagCat } from '@app/lib/tag';
import { TopicDisplay } from '@app/lib/topic/type.ts';
import * as convert from '@app/lib/types/convert.ts';
import * as fetcher from '@app/lib/types/fetcher.ts';
import * as req from '@app/lib/types/req.ts';
import * as res from '@app/lib/types/res.ts';
import type { App } from '@app/routes/type.ts';

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

/** 频道日志关联的 tag id，与旧版 `BlogCore::FetchChlNews` 中硬编码的 `$chl_news` 映射保持一致（tag cat = `TagCat.Entry`）。 */
const channelBlogTagIDs: Record<number, number> = {
  [SubjectType.Book]: 35839,
  [SubjectType.Anime]: 35838,
  [SubjectType.Music]: 35840,
  [SubjectType.Game]: 35841,
  [SubjectType.Real]: 35842,
};

function getChannelBlogTagID(type: number): number {
  const tagID = channelBlogTagIDs[type];
  if (!tagID) {
    throw new UnreachableError(`unexpected channel type ${type}`);
  }
  return tagID;
}

const channelBlogsCache = TypedCache<
  [number, number, number],
  { data: res.ISlimBlogEntry[]; total: number }
>(([type, limit, offset]) => `channel-blogs:${type}:${limit}:${offset}`, 600);

const channelTagsCache = TypedCache<
  [number, number, number],
  { data: res.ISubjectTag[]; total: number }
>(([type, limit, offset]) => `channel-tags:${type}:${limit}:${offset}`, 600);

// eslint-disable-next-line @typescript-eslint/require-await
export async function setup(app: App) {
  app.addSchema(ChannelSubjectTopic);

  app.get(
    '/channels/:type/topics',
    {
      schema: {
        summary: '获取频道条目讨论',
        operationId: 'getChannelSubjectTopics',
        tags: [Tag.Topic],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          type: req.Ref(req.SubjectType),
        }),
        querystring: t.Object({
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
    async ({ auth, params: { type }, query: { limit = 20, offset = 0 } }) => {
      const conditions = [
        op.eq(schema.chiiSubjectTopics.display, TopicDisplay.Normal),
        op.eq(schema.chiiSubjects.typeID, type),
        op.ne(schema.chiiSubjects.ban, 1),
        auth.allowNsfw ? undefined : op.eq(schema.chiiSubjects.nsfw, false),
      ];
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

  app.get(
    '/channels/:type/blogs',
    {
      schema: {
        summary: '获取频道日志',
        operationId: 'getChannelBlogs',
        tags: [Tag.Blog],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          type: req.Ref(req.SubjectType),
        }),
        querystring: t.Object({
          limit: t.Optional(
            t.Integer({ default: 6, minimum: 1, maximum: 100, description: 'max 100' }),
          ),
          offset: t.Optional(t.Integer({ default: 0, minimum: 0, description: 'min 0' })),
        }),
        response: {
          200: res.Paged(res.Ref(res.SlimBlogEntry)),
        },
      },
    },
    async ({ params: { type }, query: { limit = 6, offset = 0 } }) => {
      const result = await channelBlogsCache.cached([type, limit, offset], async () => {
        const conditions = [
          op.eq(schema.chiiBlogEntries.public, true),
          op.inArray(schema.chiiBlogEntries.type, [1, 2]), // 日志与评论
          op.eq(schema.chiiTagList.cat, TagCat.Entry),
          op.eq(schema.chiiTagList.tagID, getChannelBlogTagID(type)),
          op.eq(schema.chiiTagList.mainID, schema.chiiBlogEntries.id),
        ];

        const [{ count = 0 } = {}] = await db
          .select({ count: op.countDistinct(schema.chiiBlogEntries.id) })
          .from(schema.chiiBlogEntries)
          .innerJoin(
            schema.chiiTagList,
            op.eq(schema.chiiTagList.mainID, schema.chiiBlogEntries.id),
          )
          .where(op.and(...conditions));

        const data = await db
          .selectDistinct({
            entry: schema.chiiBlogEntries,
            user: schema.chiiUsers,
          })
          .from(schema.chiiBlogEntries)
          .innerJoin(
            schema.chiiTagList,
            op.eq(schema.chiiTagList.mainID, schema.chiiBlogEntries.id),
          )
          .leftJoin(schema.chiiUsers, op.eq(schema.chiiUsers.id, schema.chiiBlogEntries.uid))
          .where(op.and(...conditions))
          .orderBy(op.desc(schema.chiiBlogEntries.createdAt))
          .limit(limit)
          .offset(offset);

        const blogs = data.map((d) => {
          const entry = convert.toSlimBlogEntry(d.entry);
          if (d.user) {
            entry.user = convert.toSlimUser(d.user);
          }
          return entry;
        });

        return {
          data: blogs,
          total: count,
        };
      });

      return result ?? { data: [], total: 0 };
    },
  );

  app.get(
    '/channels/:type/tags',
    {
      schema: {
        summary: '获取频道热门标签',
        operationId: 'getChannelTags',
        tags: [Tag.Subject],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          type: req.Ref(req.SubjectType),
        }),
        querystring: t.Object({
          limit: t.Optional(
            t.Integer({ default: 50, minimum: 1, maximum: 100, description: 'max 100' }),
          ),
          offset: t.Optional(t.Integer({ default: 0, minimum: 0, description: 'min 0' })),
        }),
        response: {
          200: res.Paged(res.Ref(res.SubjectTag)),
        },
      },
    },
    async ({ params: { type }, query: { limit = 50, offset = 0 } }) => {
      const result = await channelTagsCache.cached([type, limit, offset], async () => {
        const conditions = [
          op.eq(schema.chiiTagIndex.cat, TagCat.Subject),
          op.eq(schema.chiiTagIndex.type, type),
        ];

        const [{ count = 0 } = {}] = await db
          .select({ count: op.count() })
          .from(schema.chiiTagIndex)
          .where(op.and(...conditions));

        const data = await db
          .select({
            name: schema.chiiTagIndex.name,
            count: schema.chiiTagIndex.count,
          })
          .from(schema.chiiTagIndex)
          .where(op.and(...conditions))
          .orderBy(op.desc(schema.chiiTagIndex.count), op.asc(schema.chiiTagIndex.name))
          .limit(limit)
          .offset(offset);

        const seen = new Set<string>();
        const tags: res.ISubjectTag[] = [];
        for (const tag of data) {
          if (seen.has(tag.name)) {
            continue;
          }
          seen.add(tag.name);
          tags.push({ name: tag.name, count: Number(tag.count) });
        }

        return {
          data: tags,
          total: count,
        };
      });

      return result ?? { data: [], total: 0 };
    },
  );
}
