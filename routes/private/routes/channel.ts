import t from 'typebox';

import { db, op, schema } from '@app/drizzle';
import { UnreachableError } from '@app/lib/error.ts';
import { Security, Tag } from '@app/lib/openapi/index.ts';
import { SubjectType } from '@app/lib/subject/type.ts';
import { TagCat } from '@app/lib/tag';
import * as convert from '@app/lib/types/convert.ts';
import * as req from '@app/lib/types/req.ts';
import * as res from '@app/lib/types/res.ts';
import type { App } from '@app/routes/type.ts';

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

// eslint-disable-next-line @typescript-eslint/require-await
export async function setup(app: App) {
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
        .innerJoin(schema.chiiTagList, op.eq(schema.chiiTagList.mainID, schema.chiiBlogEntries.id))
        .where(op.and(...conditions));

      const data = await db
        .selectDistinct({
          entry: schema.chiiBlogEntries,
          user: schema.chiiUsers,
        })
        .from(schema.chiiBlogEntries)
        .innerJoin(schema.chiiTagList, op.eq(schema.chiiTagList.mainID, schema.chiiBlogEntries.id))
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
      const conditions = [
        op.eq(schema.chiiTagList.cat, TagCat.Subject),
        op.eq(schema.chiiTagList.type, type),
      ];

      const [{ count = 0 } = {}] = await db
        .select({ count: op.countDistinct(schema.chiiTagList.tagID) })
        .from(schema.chiiTagList)
        .where(op.and(...conditions));

      const data = await db
        .select({
          tagID: schema.chiiTagList.tagID,
          name: schema.chiiTagIndex.name,
          count: op.countDistinct(schema.chiiTagList.mainID),
        })
        .from(schema.chiiTagList)
        .innerJoin(schema.chiiTagIndex, op.eq(schema.chiiTagList.tagID, schema.chiiTagIndex.id))
        .where(op.and(...conditions))
        .groupBy(schema.chiiTagList.tagID, schema.chiiTagIndex.name)
        .orderBy(
          op.desc(op.countDistinct(schema.chiiTagList.mainID)),
          op.asc(schema.chiiTagIndex.name),
        )
        .limit(limit)
        .offset(offset);

      const seen = new Set<string>();
      const tags: res.ISubjectTag[] = [];
      for (const row of data) {
        if (seen.has(row.name)) {
          continue;
        }
        seen.add(row.name);
        tags.push({ name: row.name, count: Number(row.count) });
      }

      return {
        data: tags,
        total: count,
      };
    },
  );
}
