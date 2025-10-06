import { Type as t } from '@sinclair/typebox';
import { DateTime } from 'luxon';

import { db, op, schema } from '@app/drizzle';
import { NotAllowedError } from '@app/lib/auth';
import { CommentWithoutState } from '@app/lib/comment';
import { ConflictError, NotFoundError } from '@app/lib/error.ts';
import { getSlimCacheKey } from '@app/lib/index/cache';
import { updateIndexStats } from '@app/lib/index/stats';
import { IndexPrivacy, IndexRelatedCategory } from '@app/lib/index/types.ts';
import { Security, Tag } from '@app/lib/openapi/index.ts';
import redis from '@app/lib/redis';
import * as convert from '@app/lib/types/convert.ts';
import * as fetcher from '@app/lib/types/fetcher.ts';
import * as req from '@app/lib/types/req.ts';
import * as res from '@app/lib/types/res.ts';
import { formatErrors } from '@app/lib/types/res.ts';
import { requireLogin, requireTurnstileToken } from '@app/routes/hooks/pre-handler.ts';
import type { App } from '@app/routes/type.ts';

// eslint-disable-next-line @typescript-eslint/require-await
export async function setup(app: App) {
  const comment = new CommentWithoutState(schema.chiiIndexComments);
  app.post(
    '/indexes',
    {
      schema: {
        summary: '创建目录',
        operationId: 'createIndex',
        tags: [Tag.Index],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        body: req.Ref(req.CreateIndex),
        response: {
          200: t.Object({
            id: t.Integer(),
          }),
        },
      },
      preHandler: [requireLogin('create index')],
    },
    async ({ auth, body }) => {
      const now = DateTime.now().toUnixInteger();
      const title = body.title;
      const desc = body.desc;
      const banValue = body.private ? 2 : 0;

      const [{ insertId }] = await db.insert(schema.chiiIndexes).values({
        type: 0,
        title,
        desc,
        replies: 0,
        total: 0,
        collects: 0,
        stats: '{}',
        award: 0,
        createdAt: now,
        updatedAt: now,
        uid: auth.userID,
        ban: banValue,
      });

      return { id: insertId };
    },
  );

  app.get(
    '/indexes/:indexID',
    {
      schema: {
        summary: '获取目录详情',
        operationId: 'getIndex',
        tags: [Tag.Index],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          indexID: t.Integer(),
        }),
        response: {
          200: res.Ref(res.Index),
        },
      },
    },
    async ({ params: { indexID }, auth }) => {
      const [data] = await db
        .select()
        .from(schema.chiiIndexes)
        .where(
          op.and(
            op.eq(schema.chiiIndexes.id, indexID),
            op.ne(schema.chiiIndexes.ban, IndexPrivacy.Ban),
          ),
        );
      if (!data) {
        throw new NotFoundError('index');
      }

      const index = convert.toIndex(data);

      if (index.private && (!auth || index.uid !== auth.userID)) {
        throw new NotFoundError('index');
      }

      const user = await fetcher.fetchSlimUserByID(index.uid);
      if (user) {
        index.user = user;
      }
      return index;
    },
  );

  app.patch(
    '/indexes/:indexID',
    {
      schema: {
        summary: '更新目录',
        operationId: 'updateIndex',
        tags: [Tag.Index],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          indexID: t.Integer(),
        }),
        body: req.Ref(req.UpdateIndex),
        response: {
          200: t.Object({}),
        },
      },
      preHandler: [requireLogin('update index')],
    },
    async ({ auth, params: { indexID }, body }) => {
      const index = await fetcher.fetchSlimIndexByID(indexID);
      if (!index) {
        throw new NotFoundError('index');
      }

      if (index.uid !== auth.userID) {
        throw new NotAllowedError('update index related content which is not yours');
      }

      const now = DateTime.now().toUnixInteger();
      const updateData: Partial<typeof schema.chiiIndexes.$inferInsert> = {
        title: body.title,
        desc: body.desc,
        ban: body.private ? IndexPrivacy.Private : IndexPrivacy.Normal,
        updatedAt: now,
      };

      await db
        .update(schema.chiiIndexes)
        .set(updateData)
        .where(op.eq(schema.chiiIndexes.id, indexID));

      await redis.del(getSlimCacheKey(indexID));
      return {};
    },
  );

  app.delete(
    '/indexes/:indexID',
    {
      schema: {
        summary: '删除目录',
        operationId: 'deleteIndex',
        tags: [Tag.Index],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          indexID: t.Integer(),
        }),
        response: {
          200: t.Object({}),
        },
      },
      preHandler: [requireLogin('delete index')],
    },
    async ({ auth, params: { indexID } }) => {
      const index = await fetcher.fetchSlimIndexByID(indexID);
      if (!index) {
        throw new NotFoundError('index');
      }
      if (index.uid !== auth.userID) {
        throw new NotAllowedError('delete index');
      }
      await db
        .update(schema.chiiIndexes)
        .set({ ban: IndexPrivacy.Ban })
        .where(op.eq(schema.chiiIndexes.id, indexID));
      return {};
    },
  );

  app.get(
    '/indexes/:indexID/related',
    {
      schema: {
        summary: '获取目录的关联内容',
        operationId: 'getIndexRelated',
        tags: [Tag.Index],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          indexID: t.Integer(),
        }),
        querystring: t.Object({
          cat: t.Optional(req.Ref(req.IndexRelatedCategory)),
          type: t.Optional(req.Ref(req.SubjectType)),
          limit: t.Optional(
            t.Integer({ default: 20, minimum: 1, maximum: 100, description: 'max 100' }),
          ),
          offset: t.Optional(t.Integer({ default: 0, minimum: 0, description: 'min 0' })),
        }),
        response: {
          200: res.Paged(res.Ref(res.IndexRelated)),
        },
      },
    },
    async ({ params: { indexID }, query: { cat, type, limit = 20, offset = 0 }, auth }) => {
      const index = await fetcher.fetchSlimIndexByID(indexID);
      if (!index) {
        throw new NotFoundError('index');
      }

      if (index.private && (!auth || index.uid !== auth.userID)) {
        throw new NotFoundError('index');
      }

      const conditions = [
        op.eq(schema.chiiIndexRelated.rid, indexID),
        op.eq(schema.chiiIndexRelated.ban, 0),
      ];
      if (cat !== undefined) {
        conditions.push(op.eq(schema.chiiIndexRelated.cat, cat));
      }
      if (type !== undefined) {
        conditions.push(op.eq(schema.chiiIndexRelated.type, type));
      }

      const [{ count = 0 } = {}] = await db
        .select({ count: op.count() })
        .from(schema.chiiIndexRelated)
        .where(op.and(...conditions));

      const data = await db
        .select()
        .from(schema.chiiIndexRelated)
        .where(op.and(...conditions))
        .orderBy(op.asc(schema.chiiIndexRelated.order), op.asc(schema.chiiIndexRelated.id))
        .limit(limit)
        .offset(offset);
      const items = data.map((item) => convert.toIndexRelated(item));

      const subjectIDs = items
        .filter((item) => item.cat === IndexRelatedCategory.Subject)
        .map((item) => item.sid);
      const subjects = await fetcher.fetchSlimSubjectsByIDs(subjectIDs);

      const characterIDs = items
        .filter((item) => item.cat === IndexRelatedCategory.Character)
        .map((item) => item.sid);
      const characters = await fetcher.fetchSlimCharactersByIDs(characterIDs);

      const personIDs = items
        .filter((item) => item.cat === IndexRelatedCategory.Person)
        .map((item) => item.sid);
      const persons = await fetcher.fetchSlimPersonsByIDs(personIDs);

      const episodeIDs = items
        .filter((item) => item.cat === IndexRelatedCategory.Ep)
        .map((item) => item.sid);
      const episodes = await fetcher.fetchEpisodesByIDs(episodeIDs);
      const episodeSubjectIDs = Object.values(episodes).map((episode) => episode.subjectID);
      const episodeSubjects = await fetcher.fetchSlimSubjectsByIDs(episodeSubjectIDs);

      const blogIDs = items
        .filter((item) => item.cat === IndexRelatedCategory.Blog)
        .map((item) => item.sid);
      const blogs = await fetcher.fetchSlimBlogEntriesByIDs(blogIDs, index.uid);

      const groupTopicIDs = items
        .filter((item) => item.cat === IndexRelatedCategory.GroupTopic)
        .map((item) => item.sid);
      const groupTopics = await fetcher.fetchGroupTopicsByIDs(groupTopicIDs);
      const groupIDs = Object.values(groupTopics).map((topic) => topic.parentID);
      const groups = await fetcher.fetchSlimGroupsByIDs(groupIDs);

      const subjectTopicIDs = items
        .filter((item) => item.cat === IndexRelatedCategory.SubjectTopic)
        .map((item) => item.sid);
      const subjectTopics = await fetcher.fetchSubjectTopicsByIDs(subjectTopicIDs);
      const topicSubjectIDs = Object.values(subjectTopics).map((topic) => topic.parentID);
      const topicSubjects = await fetcher.fetchSlimSubjectsByIDs(topicSubjectIDs);

      const result = [];
      for (const item of items) {
        switch (item.cat) {
          case IndexRelatedCategory.Subject: {
            item.subject = subjects[item.sid];
            break;
          }
          case IndexRelatedCategory.Character: {
            item.character = characters[item.sid];
            break;
          }
          case IndexRelatedCategory.Person: {
            item.person = persons[item.sid];
            break;
          }
          case IndexRelatedCategory.Ep: {
            const episode = episodes[item.sid];
            if (episode) {
              episode.subject = episodeSubjects[episode.subjectID];
              item.episode = episode;
            }
            break;
          }
          case IndexRelatedCategory.Blog: {
            item.blog = blogs[item.sid];
            break;
          }
          case IndexRelatedCategory.GroupTopic: {
            const topic = groupTopics[item.sid];
            if (topic?.parentID) {
              const group = groups[topic.parentID];
              if (group) {
                item.groupTopic = {
                  ...topic,
                  group,
                  replies: [],
                };
              }
            }
            break;
          }
          case IndexRelatedCategory.SubjectTopic: {
            const topic = subjectTopics[item.sid];
            if (topic) {
              const subject = topicSubjects[topic.parentID];
              if (subject) {
                item.subjectTopic = {
                  ...topic,
                  subject,
                  replies: [],
                };
              }
            }
            break;
          }
        }
        result.push(item);
      }
      return {
        data: result,
        total: count,
      };
    },
  );

  app.put(
    '/indexes/:indexID/related',
    {
      schema: {
        summary: '添加目录关联内容',
        operationId: 'putIndexRelated',
        tags: [Tag.Index],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          indexID: t.Integer(),
        }),
        body: req.Ref(req.CreateIndexRelated),
        response: {
          200: t.Object({
            id: t.Integer(),
          }),
        },
      },
      preHandler: [requireLogin('add index related content')],
    },
    async ({ auth, params: { indexID }, body }) => {
      const index = await fetcher.fetchSlimIndexByID(indexID);
      if (!index) {
        throw new NotFoundError('index');
      }

      if (index.uid !== auth.userID) {
        throw new NotAllowedError('update index related content which is not yours');
      }

      let type = 0;
      if (body.cat === IndexRelatedCategory.Subject) {
        const subject = await fetcher.fetchSlimSubjectByID(body.sid);
        if (subject) {
          type = subject.type;
        } else {
          throw new NotFoundError('subject');
        }
      }

      const [existing] = await db
        .select()
        .from(schema.chiiIndexRelated)
        .where(
          op.and(
            op.eq(schema.chiiIndexRelated.rid, indexID),
            op.eq(schema.chiiIndexRelated.cat, body.cat),
            op.eq(schema.chiiIndexRelated.sid, body.sid),
          ),
        );

      const now = DateTime.now().toUnixInteger();
      const order = body.order ?? 0;
      const commentContent = body.comment ?? '';
      const award = body.award ?? '';

      let returnID = existing?.id;
      if (existing) {
        if (existing.ban === 0) {
          throw new ConflictError('Related item already exists');
        } else {
          await db
            .update(schema.chiiIndexRelated)
            .set({
              type,
              order,
              comment: commentContent,
              award,
              ban: 0,
              createdAt: now,
            })
            .where(op.eq(schema.chiiIndexRelated.id, existing.id));
          returnID = existing.id;
        }
      } else {
        const [{ insertId }] = await db.insert(schema.chiiIndexRelated).values({
          cat: body.cat,
          rid: indexID,
          type,
          sid: body.sid,
          order,
          comment: commentContent,
          award,
          ban: 0,
          createdAt: now,
        });
        returnID = insertId;
      }

      await updateIndexStats(indexID);

      await redis.del(getSlimCacheKey(indexID));
      return { id: returnID };
    },
  );

  app.patch(
    '/indexes/:indexID/related/:id',
    {
      schema: {
        summary: '更新目录关联内容',
        operationId: 'patchIndexRelated',
        tags: [Tag.Index],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          indexID: t.Integer(),
          id: t.Integer(),
        }),
        body: req.Ref(req.UpdateIndexRelated),
        response: {
          200: t.Object({}),
        },
      },
      preHandler: [requireLogin('update index related content')],
    },
    async ({ auth, params: { indexID, id }, body }) => {
      const index = await fetcher.fetchSlimIndexByID(indexID);
      if (!index) {
        throw new NotFoundError('index');
      }

      if (index.uid !== auth.userID) {
        throw new NotAllowedError('update index related content which is not yours');
      }

      const [existing] = await db
        .select()
        .from(schema.chiiIndexRelated)
        .where(
          op.and(
            op.eq(schema.chiiIndexRelated.id, id),
            op.eq(schema.chiiIndexRelated.rid, indexID),
            op.eq(schema.chiiIndexRelated.ban, 0),
          ),
        );

      if (!existing) {
        throw new NotFoundError('index related item');
      }

      await db
        .update(schema.chiiIndexRelated)
        .set({
          order: body.order,
          comment: body.comment,
        })
        .where(op.eq(schema.chiiIndexRelated.id, id));

      await redis.del(getSlimCacheKey(indexID));
      return {};
    },
  );

  app.delete(
    '/indexes/:indexID/related/:id',
    {
      schema: {
        summary: '删除目录关联内容',
        operationId: 'deleteIndexRelated',
        tags: [Tag.Index],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          indexID: t.Integer(),
          id: t.Integer(),
        }),
        response: {
          200: t.Object({}),
        },
      },
      preHandler: [requireLogin('delete index related content')],
    },
    async ({ auth, params: { indexID, id } }) => {
      const index = await fetcher.fetchSlimIndexByID(indexID);
      if (!index) {
        throw new NotFoundError('index');
      }

      if (index.uid !== auth.userID) {
        throw new NotAllowedError('update index related content which is not yours');
      }

      const [existing] = await db
        .select()
        .from(schema.chiiIndexRelated)
        .where(
          op.and(
            op.eq(schema.chiiIndexRelated.id, id),
            op.eq(schema.chiiIndexRelated.rid, indexID),
            op.eq(schema.chiiIndexRelated.ban, 0),
          ),
        );

      if (!existing) {
        throw new NotFoundError('index related item');
      }

      await db
        .update(schema.chiiIndexRelated)
        .set({ ban: 1 })
        .where(op.eq(schema.chiiIndexRelated.id, id));

      await updateIndexStats(indexID);

      await redis.del(getSlimCacheKey(indexID));
      return {};
    },
  );

  app.get(
    '/indexes/:indexID/comments',
    {
      schema: {
        summary: '获取目录的评论',
        operationId: 'getIndexComments',
        tags: [Tag.Index],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          indexID: t.Integer(),
        }),
        response: {
          200: t.Array(res.Comment),
          404: res.Ref(res.Error, {
            'x-examples': formatErrors(new NotFoundError('index')),
          }),
        },
      },
    },
    async ({ params: { indexID }, auth }) => {
      const index = await fetcher.fetchSlimIndexByID(indexID);
      if (!index) {
        throw new NotFoundError('index');
      }

      if (index.private && (!auth || index.uid !== auth.userID)) {
        throw new NotFoundError('index');
      }

      return await comment.getAll(indexID);
    },
  );

  app.post(
    '/indexes/:indexID/comments',
    {
      schema: {
        summary: '创建目录的评论',
        operationId: 'createIndexComment',
        tags: [Tag.Index],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          indexID: t.Integer(),
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
    async ({ auth, body: { content, replyTo = 0 }, params: { indexID } }) => {
      const index = await fetcher.fetchSlimIndexByID(indexID);
      if (!index) {
        throw new NotFoundError('index');
      }

      if (index.private && (!auth || index.uid !== auth.userID)) {
        throw new NotFoundError('index');
      }

      return await comment.create(auth, indexID, content, replyTo);
    },
  );

  app.put(
    '/indexes/-/comments/:commentID',
    {
      schema: {
        summary: '编辑目录的评论',
        operationId: 'updateIndexComment',
        tags: [Tag.Index],
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
    '/indexes/-/comments/:commentID',
    {
      schema: {
        summary: '删除目录的评论',
        operationId: 'deleteIndexComment',
        tags: [Tag.Index],
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
}
