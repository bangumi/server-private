import { DateTime } from 'luxon';
import t from 'typebox';

import { db, op, schema } from '@app/drizzle';
import { NotAllowedError } from '@app/lib/auth';
import { CommentWithoutState } from '@app/lib/comment';
import { Dam, dam } from '@app/lib/dam.ts';
import { BadRequestError, NotFoundError } from '@app/lib/error.ts';
import { Security, Tag } from '@app/lib/openapi/index.ts';
import { insertUserTags, TagCat, updateTagResult, validateTags } from '@app/lib/tag';
import { TimelineCat } from '@app/lib/timeline/type.ts';
import * as convert from '@app/lib/types/convert.ts';
import * as fetcher from '@app/lib/types/fetcher.ts';
import * as req from '@app/lib/types/req.ts';
import * as res from '@app/lib/types/res.ts';
import { formatErrors } from '@app/lib/types/res.ts';
import { isFriends } from '@app/lib/user/utils.ts';
import { LimitAction } from '@app/lib/utils/rate-limit';
import { requireLogin, requireTurnstileToken } from '@app/routes/hooks/pre-handler';
import { rateLimit } from '@app/routes/hooks/rate-limit';
import type { App } from '@app/routes/type.ts';

// eslint-disable-next-line @typescript-eslint/require-await
export async function setup(app: App) {
  const comment = new CommentWithoutState(schema.chiiBlogComments);

  app.post(
    '/blogs',
    {
      schema: {
        summary: '发布日志',
        description: '发布日志（type 固定为 1 日志），可携带标签、关联条目与已上传图片',
        operationId: 'createBlogEntry',
        tags: [Tag.Blog],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        body: t.Intersect([req.Ref(req.CreateBlog), req.Ref(req.TurnstileToken)]),
        response: {
          200: t.Object({
            id: t.Integer({ description: 'new blog entry id' }),
          }),
          400: res.Ref(res.Error),
          429: res.Ref(res.Error),
        },
      },
      preHandler: [requireLogin('create blog entry'), requireTurnstileToken()],
    },
    async ({ auth, body }) => {
      const { subjectIDs, photoIDs } = body;
      const title = body.title.trim();
      if (title === '') {
        throw new BadRequestError('title is required');
      }
      const content = body.content.trim();
      if (content === '') {
        throw new BadRequestError('content is required');
      }
      if (!Dam.allCharacterPrintable(title) || !Dam.allCharacterPrintable(content)) {
        throw new BadRequestError('invisible character are included in title or content');
      }
      if ([...content].length > 100000) {
        throw new BadRequestError('content too long, only allow less equal than 100000 characters');
      }
      if (dam.needReview(title) || dam.needReview(content)) {
        throw new BadRequestError('title or content is not allowed');
      }
      if (subjectIDs && subjectIDs.length > 5) {
        throw new BadRequestError('subjectIDs too many, only allow at most 5');
      }
      const tags = body.tags ? validateTags(body.tags) : [];

      await rateLimit(LimitAction.Blog, auth.userID);

      const now = DateTime.now().toUnixInteger();
      const isPublic = body.public ?? true;
      let entryID = 0;
      await db.transaction(async (t) => {
        const [result] = await t.insert(schema.chiiBlogEntries).values({
          type: 1,
          uid: auth.userID,
          title,
          icon: '',
          content,
          tags: tags.join(' '),
          views: 0,
          replies: 0,
          createdAt: now,
          updatedAt: now,
          like: 0,
          dislike: 0,
          noreply: 0,
          related: subjectIDs && subjectIDs.length > 0 ? 1 : 0,
          public: isPublic,
        });
        entryID = result.insertId;

        if (tags.length > 0) {
          await insertUserTags(t, auth.userID, TagCat.Entry, 1, entryID, tags);
        }

        if (subjectIDs && subjectIDs.length > 0) {
          await t.insert(schema.chiiSubjectRelatedBlogs).values(
            subjectIDs.map((subjectID) => ({
              uid: auth.userID,
              subjectID,
              entryID,
              spoiler: 0,
              like: 0,
              dislike: 0,
              createdAt: now,
            })),
          );
        }

        if (photoIDs && photoIDs.length > 0) {
          await t
            .update(schema.chiiBlogPhotos)
            .set({ eid: entryID })
            .where(
              op.and(
                op.inArray(schema.chiiBlogPhotos.id, photoIDs),
                op.eq(schema.chiiBlogPhotos.uid, auth.userID),
                op.eq(schema.chiiBlogPhotos.eid, 0),
              ),
            );
        }
      });
      return { id: entryID };
    },
  );

  app.get(
    '/blogs/:entryID',
    {
      schema: {
        summary: '获取日志详情',
        operationId: 'getBlogEntry',
        tags: [Tag.Blog],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
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
      if (!isFriend && !entry.public && entry.user.id !== auth.userID) {
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
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          entryID: t.Integer(),
        }),
        response: {
          200: t.Array(res.Ref(res.SlimSubject)),
        },
      },
    },
    async ({ auth, params: { entryID } }) => {
      const entry = await fetcher.fetchSlimBlogEntryByID(entryID, auth.userID);
      if (!entry) {
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
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
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
      const entry = await fetcher.fetchSlimBlogEntryByID(entryID, auth.userID);
      if (!entry) {
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

  app.get(
    '/blogs/:entryID/comments',
    {
      schema: {
        summary: '获取日志的吐槽箱',
        operationId: 'getBlogComments',
        tags: [Tag.Blog],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          entryID: t.Integer(),
        }),
        response: {
          200: t.Array(res.Comment),
          404: res.Ref(res.Error, {
            'x-examples': formatErrors(new NotFoundError('blog entry')),
          }),
        },
      },
    },
    async ({ auth, params: { entryID } }) => {
      const entry = await fetcher.fetchSlimBlogEntryByID(entryID, auth.userID);
      if (!entry) {
        throw new NotFoundError('Blog entry not found');
      }
      return await comment.getAll(entryID, auth.login ? auth.userID : undefined);
    },
  );

  app.post(
    '/blogs/:entryID/comments',
    {
      schema: {
        summary: '创建日志的吐槽',
        operationId: 'createBlogComment',
        tags: [Tag.Blog],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          entryID: t.Integer(),
        }),
        body: t.Intersect([req.Ref(req.CreateReply), req.Ref(req.TurnstileToken)]),
        response: {
          200: t.Object({
            id: t.Integer({ description: 'new comment id' }),
          }),
          429: res.Ref(res.Error),
        },
      },
      preHandler: [requireLogin('creating a comment'), requireTurnstileToken()],
    },
    async ({ auth, body: { content, replyTo = 0 }, params: { entryID } }) => {
      const entry = await fetcher.fetchSlimBlogEntryByID(entryID, auth.userID);
      if (!entry) {
        throw new NotFoundError('Blog entry not found');
      }
      return await comment.create(auth, entryID, content, replyTo);
    },
  );

  app.put(
    '/blogs/-/comments/:commentID',
    {
      schema: {
        summary: '编辑日志的吐槽',
        operationId: 'updateBlogComment',
        tags: [Tag.Blog],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          commentID: t.Integer(),
        }),
        body: req.Ref(req.UpdateContent),
        response: {
          200: t.Object({}),
        },
      },
      preHandler: [requireLogin('edit a comment')],
    },
    async ({ auth, body: { content }, params: { commentID } }) => {
      return await comment.update(auth, commentID, content);
    },
  );

  app.delete(
    '/blogs/-/comments/:commentID',
    {
      schema: {
        summary: '删除日志的吐槽',
        operationId: 'deleteBlogComment',
        tags: [Tag.Blog],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          commentID: t.Integer(),
        }),
        response: {
          200: t.Object({}),
        },
      },
      preHandler: [requireLogin('delete a comment')],
    },
    async ({ auth, params: { commentID } }) => {
      return await comment.delete(auth, commentID);
    },
  );

  app.patch(
    '/blogs/:entryID',
    {
      schema: {
        summary: '编辑日志',
        description: '编辑自己的日志，字段全可选；全部不传返回 400',
        operationId: 'updateBlogEntry',
        tags: [Tag.Blog],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          entryID: t.Integer(),
        }),
        body: req.Ref(req.UpdateBlog),
        response: {
          200: t.Object({}),
          400: res.Ref(res.Error),
          404: res.Ref(res.Error),
        },
      },
      preHandler: [requireLogin('update blog entry')],
    },
    async ({ auth, params: { entryID }, body }) => {
      const [current] = await db
        .select()
        .from(schema.chiiBlogEntries)
        .where(op.eq(schema.chiiBlogEntries.id, entryID))
        .limit(1);
      if (!current) {
        throw new NotFoundError('Blog entry not found');
      }
      if (current.uid !== auth.userID) {
        throw new NotAllowedError('update a blog entry which is not yours');
      }

      const { title, content, tags, public: isPublic, subjectIDs, photoIDs } = body;
      if (
        title === undefined &&
        content === undefined &&
        tags === undefined &&
        isPublic === undefined &&
        subjectIDs === undefined &&
        photoIDs === undefined
      ) {
        throw new BadRequestError('no update');
      }

      const newTitle = title?.trim();
      if (newTitle === '') {
        throw new BadRequestError('title is required');
      }
      const newContent = content?.trim();
      if (newContent === '') {
        throw new BadRequestError('content is required');
      }
      const effectiveTitle = newTitle ?? current.title;
      const effectiveContent = newContent ?? current.content;
      if (
        !Dam.allCharacterPrintable(effectiveTitle) ||
        !Dam.allCharacterPrintable(effectiveContent)
      ) {
        throw new BadRequestError('invisible character are included in title or content');
      }
      if ([...effectiveContent].length > 100000) {
        throw new BadRequestError('content too long, only allow less equal than 100000 characters');
      }
      if (dam.needReview(effectiveTitle) || dam.needReview(effectiveContent)) {
        throw new BadRequestError('title or content is not allowed');
      }
      if (subjectIDs && subjectIDs.length > 5) {
        throw new BadRequestError('subjectIDs too many, only allow at most 5');
      }

      await rateLimit(LimitAction.Blog, auth.userID);

      const now = DateTime.now().toUnixInteger();
      await db.transaction(async (t) => {
        const toUpdate: Partial<typeof schema.chiiBlogEntries.$inferInsert> = {
          updatedAt: now,
        };
        if (newTitle !== undefined) {
          toUpdate.title = newTitle;
        }
        if (newContent !== undefined) {
          toUpdate.content = newContent;
        }
        if (isPublic !== undefined) {
          toUpdate.public = isPublic;
        }
        if (tags !== undefined) {
          const validTags = await insertUserTags(t, auth.userID, TagCat.Entry, 1, entryID, tags);
          toUpdate.tags = validTags.join(' ');
        }
        if (subjectIDs !== undefined) {
          await t
            .delete(schema.chiiSubjectRelatedBlogs)
            .where(op.eq(schema.chiiSubjectRelatedBlogs.entryID, entryID));
          if (subjectIDs.length > 0) {
            await t.insert(schema.chiiSubjectRelatedBlogs).values(
              subjectIDs.map((subjectID) => ({
                uid: auth.userID,
                subjectID,
                entryID,
                spoiler: 0,
                like: 0,
                dislike: 0,
                createdAt: now,
              })),
            );
          }
          toUpdate.related = subjectIDs.length > 0 ? 1 : 0;
        }
        if (photoIDs && photoIDs.length > 0) {
          await t
            .update(schema.chiiBlogPhotos)
            .set({ eid: entryID })
            .where(
              op.and(
                op.inArray(schema.chiiBlogPhotos.id, photoIDs),
                op.eq(schema.chiiBlogPhotos.uid, auth.userID),
                op.eq(schema.chiiBlogPhotos.eid, 0),
              ),
            );
        }
        await t
          .update(schema.chiiBlogEntries)
          .set(toUpdate)
          .where(op.eq(schema.chiiBlogEntries.id, entryID))
          .limit(1);
      });
      return {};
    },
  );

  app.delete(
    '/blogs/:entryID',
    {
      schema: {
        summary: '删除日志',
        description: '删除自己的日志，级联清理评论、关联条目、照片、标签与时间线',
        operationId: 'deleteBlogEntry',
        tags: [Tag.Blog],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          entryID: t.Integer(),
        }),
        response: {
          200: t.Object({}),
          404: res.Ref(res.Error),
        },
      },
      preHandler: [requireLogin('delete blog entry')],
    },
    async ({ auth, params: { entryID } }) => {
      const [current] = await db
        .select({ uid: schema.chiiBlogEntries.uid })
        .from(schema.chiiBlogEntries)
        .where(op.eq(schema.chiiBlogEntries.id, entryID))
        .limit(1);
      if (!current) {
        throw new NotFoundError('Blog entry not found');
      }
      if (current.uid !== auth.userID) {
        throw new NotAllowedError('delete a blog entry which is not yours');
      }

      await rateLimit(LimitAction.Blog, auth.userID);

      await db.transaction(async (t) => {
        await t
          .delete(schema.chiiBlogEntries)
          .where(op.eq(schema.chiiBlogEntries.id, entryID))
          .limit(1);
        await t.delete(schema.chiiBlogComments).where(op.eq(schema.chiiBlogComments.mid, entryID));
        await t
          .delete(schema.chiiSubjectRelatedBlogs)
          .where(op.eq(schema.chiiSubjectRelatedBlogs.entryID, entryID));
        await t.delete(schema.chiiBlogPhotos).where(op.eq(schema.chiiBlogPhotos.eid, entryID));

        // 清理标签关联并更新标签计数
        const tagList = await t
          .select({ tagID: schema.chiiTagList.tagID })
          .from(schema.chiiTagList)
          .where(
            op.and(
              op.eq(schema.chiiTagList.userID, auth.userID),
              op.eq(schema.chiiTagList.cat, TagCat.Entry),
              op.eq(schema.chiiTagList.type, 1),
              op.eq(schema.chiiTagList.mainID, entryID),
            ),
          );
        if (tagList.length > 0) {
          await t
            .delete(schema.chiiTagList)
            .where(
              op.and(
                op.eq(schema.chiiTagList.userID, auth.userID),
                op.eq(schema.chiiTagList.cat, TagCat.Entry),
                op.eq(schema.chiiTagList.type, 1),
                op.eq(schema.chiiTagList.mainID, entryID),
              ),
            );
          await updateTagResult(
            t,
            tagList.map((x) => x.tagID),
          );
        }

        // 删除日志相关时间线（cat=6, 非批量合并）
        await t
          .delete(schema.chiiTimeline)
          .where(
            op.and(
              op.eq(schema.chiiTimeline.uid, auth.userID),
              op.eq(schema.chiiTimeline.cat, TimelineCat.Blog),
              op.eq(schema.chiiTimeline.related, entryID.toString()),
              op.eq(schema.chiiTimeline.batch, false),
            ),
          );
      });
      return {};
    },
  );
}
