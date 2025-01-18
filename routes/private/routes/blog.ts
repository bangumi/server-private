import { Type as t } from '@sinclair/typebox';

import { db, op } from '@app/drizzle/db.ts';
import * as schema from '@app/drizzle/schema';
import { NotFoundError } from '@app/lib/error.ts';
import { Security, Tag } from '@app/lib/openapi/index.ts';
import * as convert from '@app/lib/types/convert.ts';
import * as fetcher from '@app/lib/types/fetcher.ts';
import * as res from '@app/lib/types/res.ts';
import { isFriends } from '@app/lib/user/utils.ts';
import type { App } from '@app/routes/type.ts';

// eslint-disable-next-line @typescript-eslint/require-await
export async function setup(app: App) {
  app.get(
    '/blogs/:entryID',
    {
      schema: {
        summary: '获取日志详情',
        operationId: 'getBlogEntry',
        tags: [Tag.Blog],
        security: [{ [Security.HTTPBearer]: [] }],
        params: t.Object({
          entryID: t.Integer(),
        }),
        response: {
          200: res.Ref(res.BlogEntry),
        },
      },
    },
    async ({ auth, params: { entryID } }) => {
      const [item] = await db
        .select()
        .from(schema.chiiBlogEntries)
        .innerJoin(schema.chiiUsers, op.eq(schema.chiiUsers.id, schema.chiiBlogEntries.uid))
        .where(op.eq(schema.chiiBlogEntries.id, entryID));
      if (!item) {
        throw new NotFoundError('Blog entry not found');
      }
      const entry = convert.toBlogEntry(item.chii_blog_entry, item.chii_members);
      const isFriend = await isFriends(entry.user.id, auth.userID);
      if (!entry.public && entry.user.id !== auth.userID && !isFriend) {
        throw new NotFoundError('Blog entry not found');
      }
      return entry;
    },
  );

  app.get(
    '/blogs/:entryID/subjects',
    {
      schema: {
        summary: '获取日志的关联条目',
        operationId: 'getBlogRelatedSubjects',
        tags: [Tag.Blog],
        security: [{ [Security.HTTPBearer]: [] }],
        params: t.Object({
          entryID: t.Integer(),
        }),
        response: {
          200: t.Array(res.Ref(res.SlimSubject)),
        },
      },
    },
    async ({ auth, params: { entryID } }) => {
      const entry = await fetcher.fetchSlimBlogEntryByID(entryID);
      if (!entry) {
        throw new NotFoundError('Blog entry not found');
      }
      const isFriend = await isFriends(entry.uid, auth.userID);
      if (!entry.public && entry.uid !== auth.userID && !isFriend) {
        throw new NotFoundError('Blog entry not found');
      }

      const data = await db
        .select({ id: schema.chiiSubjectRelatedBlogs.subjectID })
        .from(schema.chiiSubjectRelatedBlogs)
        .where(op.eq(schema.chiiSubjectRelatedBlogs.entryID, entryID))
        .orderBy(op.desc(schema.chiiSubjectRelatedBlogs.id));
      const subjectIDs = data.map((item) => item.id);
      const subjects = await fetcher.fetchSlimSubjectsByIDs(subjectIDs);
      const result = [];
      for (const id of subjectIDs) {
        const subject = subjects[id];
        if (!subject) {
          continue;
        }
        if (!auth.allowNsfw && subject.nsfw) {
          continue;
        }
        result.push(subject);
      }
      return result;
    },
  );

  app.get(
    '/blogs/:entryID/photos',
    {
      schema: {
        summary: '获取日志的图片',
        operationId: 'getBlogPhotos',
        tags: [Tag.Blog],
        security: [{ [Security.HTTPBearer]: [] }],
        params: t.Object({
          entryID: t.Integer(),
        }),
        querystring: t.Object({
          limit: t.Optional(
            t.Integer({ default: 20, minimum: 1, maximum: 100, description: 'max 100' }),
          ),
          offset: t.Optional(t.Integer({ default: 0, minimum: 0, description: 'min 0' })),
        }),
        response: {
          200: res.Paged(res.Ref(res.BlogPhoto)),
        },
      },
    },
    async ({ auth, params: { entryID }, query: { limit = 20, offset = 0 } }) => {
      const entry = await fetcher.fetchSlimBlogEntryByID(entryID);
      if (!entry) {
        throw new NotFoundError('Blog entry not found');
      }
      // 只允许查看自己的日志图片
      if (entry.uid !== auth.userID) {
        throw new NotFoundError('Blog entry not found');
      }

      const [{ count = 0 } = {}] = await db
        .select({ count: op.count() })
        .from(schema.chiiBlogPhotos)
        .where(op.eq(schema.chiiBlogPhotos.eid, entryID));

      const data = await db
        .select()
        .from(schema.chiiBlogPhotos)
        .where(op.eq(schema.chiiBlogPhotos.eid, entryID))
        .orderBy(op.desc(schema.chiiBlogPhotos.createdAt))
        .limit(limit)
        .offset(offset);

      const photos = data.map((photo) => convert.toBlogPhoto(photo));

      return {
        data: photos,
        total: count,
      };
    },
  );
}
