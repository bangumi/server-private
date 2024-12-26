import { Type as t } from '@sinclair/typebox';
import { DateTime } from 'luxon';

import { db, op } from '@app/drizzle/db.ts';
import * as schema from '@app/drizzle/schema';
import { NotAllowedError } from '@app/lib/auth/index.ts';
import { Dam } from '@app/lib/dam.ts';
import { BadRequestError, CaptchaError, NotFoundError } from '@app/lib/error.ts';
import { Security, Tag } from '@app/lib/openapi/index.ts';
import { turnstile } from '@app/lib/services/turnstile.ts';
import { CommentState } from '@app/lib/topic/type.ts';
import * as convert from '@app/lib/types/convert.ts';
import * as fetcher from '@app/lib/types/fetcher.ts';
import * as req from '@app/lib/types/req.ts';
import * as res from '@app/lib/types/res.ts';
import { LimitAction } from '@app/lib/utils/rate-limit';
import { requireLogin } from '@app/routes/hooks/pre-handler.ts';
import { rateLimit } from '@app/routes/hooks/rate-limit';
import type { App } from '@app/routes/type.ts';

// eslint-disable-next-line @typescript-eslint/require-await
export async function setup(app: App) {
  app.get(
    '/subjects/-/episodes/:episodeID',
    {
      schema: {
        summary: '获取剧集信息',
        tags: [Tag.Episode],
        operationId: 'getSubjectEpisode',
        params: t.Object({
          episodeID: t.Integer({ examples: [1075440] }),
        }),
        response: {
          200: res.Ref(res.Episode),
        },
      },
    },
    async ({ params: { episodeID } }): Promise<res.IEpisode> => {
      const ep = await fetcher.fetchEpisodeByID(episodeID);
      if (!ep) {
        throw new NotFoundError(`episode ${episodeID}`);
      }
      return ep;
    },
  );

  app.get('/subjects/-/episode/:episodeID', (req, reply) => {
    const params = req.params as Record<string, string>;
    const episodeID = params.episodeID ?? '';
    return reply.redirect(`/p1/subjects/-/episodes/${episodeID}`, 307);
  });

  app.get(
    '/subjects/-/episodes/:episodeID/comments',
    {
      schema: {
        summary: '获取条目的剧集吐槽箱',
        tags: [Tag.Episode],
        operationId: 'getSubjectEpisodeComments',
        params: t.Object({
          episodeID: t.Integer({ examples: [1075440], minimum: 0 }),
        }),
        response: {
          200: t.Array(res.EpisodeComment),
        },
      },
    },
    async ({ params: { episodeID } }): Promise<res.IEpisodeComment[]> => {
      const ep = await fetcher.fetchSlimEpisodeByID(episodeID);
      if (!ep) {
        throw new NotFoundError(`episode ${episodeID}`);
      }
      const data = await db
        .select()
        .from(schema.chiiEpComments)
        .where(op.eq(schema.chiiEpComments.mid, episodeID));

      const userIDs = new Set(data.map((v) => v.uid));
      const users = await fetcher.fetchSlimUsersByIDs([...userIDs]);

      const comments: res.IEpisodeComment[] = [];
      const replies: Record<number, res.IEpisodeCommentBase[]> = {};

      for (const d of data) {
        const u = users[d.uid];
        if (!u) {
          continue;
        }
        if (d.related === 0) {
          comments.push(convert.toEpisodeComment(d, u));
        } else {
          const rs = replies[d.related] ?? [];
          rs.push(convert.toEpisodeCommentBase(d, u));
          replies[d.related] = rs;
        }
      }
      for (const comment of comments) {
        comment.replies = replies[comment.id] ?? [];
      }

      return comments;
    },
  );

  app.get('/subjects/-/episode/:episodeID/comments', (req, reply) => {
    const params = req.params as Record<string, string>;
    const episodeID = params.episodeID ?? '';
    return reply.redirect(`/p1/subjects/-/episodes/${episodeID}/comments`, 307);
  });

  app.post(
    '/subjects/-/episodes/:episodeID/comments',
    {
      schema: {
        summary: '创建条目的剧集吐槽',
        operationId: 'createSubjectEpComment',
        params: t.Object({
          episodeID: t.Integer({ examples: [1075440] }),
        }),
        tags: [Tag.Episode],
        response: {
          200: t.Object({
            id: t.Integer({ description: 'new reply id' }),
          }),
        },
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        body: req.Ref(req.CreateEpisodeComment),
      },
      preHandler: [requireLogin('creating a comment')],
    },
    /**
     * @param auth -
     * @param content - 吐槽内容
     * @param relatedID - 子吐槽的父吐槽ID，默认为 `0` 代表发送顶层吐槽
     * @param episodeID - 剧集 ID
     */
    async ({
      auth,
      body: { 'cf-turnstile-response': cfCaptchaResponse, content, replyTo = 0 },
      params: { episodeID },
    }) => {
      if (!(await turnstile.verify(cfCaptchaResponse))) {
        throw new CaptchaError();
      }
      if (!Dam.allCharacterPrintable(content)) {
        throw new BadRequestError('text contains invalid invisible character');
      }
      if (auth.permission.ban_post) {
        throw new NotAllowedError('create comment');
      }

      const ep = await fetcher.fetchSlimEpisodeByID(episodeID);
      if (!ep) {
        throw new NotFoundError(`episode ${episodeID}`);
      }

      if (replyTo !== 0) {
        const [parent] = await db
          .select({ id: schema.chiiEpComments.id, state: schema.chiiEpComments.state })
          .from(schema.chiiEpComments)
          .where(op.eq(schema.chiiEpComments.id, replyTo));
        if (!parent) {
          throw new NotFoundError(`parent comment id ${replyTo}`);
        }
        if (parent.state !== CommentState.Normal) {
          throw new NotAllowedError(`reply to a abnormal state comment`);
        }
      }

      await rateLimit(LimitAction.Subject, auth.userID);

      const reply: typeof schema.chiiEpComments.$inferInsert = {
        mid: episodeID,
        uid: auth.userID,
        related: replyTo,
        content: content,
        createdAt: DateTime.now().toUnixInteger(),
        state: CommentState.Normal,
      };
      const [result] = await db.insert(schema.chiiEpComments).values(reply);

      return { id: result.insertId };
    },
  );

  app.post('/subjects/-/episode/:episodeID/comments', (req, reply) => {
    const params = req.params as Record<string, string>;
    const episodeID = params.episodeID ?? '';
    return reply.redirect(`/p1/subjects/-/episodes/${episodeID}/comments`, 307);
  });

  app.put(
    '/subjects/-/episodes/-/comments/:commentID',
    {
      schema: {
        summary: '编辑条目的剧集吐槽',
        operationId: 'updateSubjectEpComment',
        params: t.Object({
          commentID: t.Integer({ examples: [1075440] }),
        }),
        tags: [Tag.Episode],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        body: req.Ref(req.UpdateEpisodeComment),
      },
      preHandler: [requireLogin('edit a comment')],
    },

    async ({ auth, body: { content }, params: { commentID } }) => {
      const [comment] = await db
        .select()
        .from(schema.chiiEpComments)
        .where(op.eq(schema.chiiEpComments.id, commentID));
      if (!comment) {
        throw new NotFoundError(`comment id ${commentID}`);
      }
      if (comment.uid !== auth.userID) {
        throw new NotAllowedError('edit a comment which is not yours');
      }
      if (comment.state !== CommentState.Normal) {
        throw new NotAllowedError(`edit to a abnormal state comment`);
      }

      const [{ replies = 0 } = {}] = await db
        .select({ replies: op.count() })
        .from(schema.chiiEpComments)
        .where(op.eq(schema.chiiEpComments.related, commentID));
      if (replies > 0) {
        throw new NotAllowedError('cannot edit a comment with replies');
      }

      await db
        .update(schema.chiiEpComments)
        .set({ content: content })
        .where(op.eq(schema.chiiEpComments.id, commentID));

      return {};
    },
  );

  app.put('/subjects/-/episode/-/comments/:commentID', (req, reply) => {
    const params = req.params as Record<string, string>;
    const commentID = params.commentID ?? '';
    return reply.redirect(`/p1/subjects/-/episodes/-/comments/${commentID}`, 307);
  });

  app.delete(
    '/subjects/-/episodes/-/comments/:commentID',
    {
      schema: {
        summary: '删除条目的剧集吐槽',
        operationId: 'deleteSubjectEpComment',
        params: t.Object({
          commentID: t.Integer({ examples: [1034989] }),
        }),
        tags: [Tag.Episode],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
      },
      preHandler: [requireLogin('delete a comment')],
    },
    async ({ auth, params: { commentID } }) => {
      const [comment] = await db
        .select()
        .from(schema.chiiEpComments)
        .where(op.eq(schema.chiiEpComments.id, commentID));
      if (!comment) {
        throw new NotFoundError(`comment id ${commentID}`);
      }
      if (comment.uid !== auth.userID) {
        throw new NotAllowedError('delete a comment which is not yours');
      }
      if (comment.state !== CommentState.Normal) {
        throw new NotAllowedError('delete a abnormal state comment');
      }
      await db
        .update(schema.chiiEpComments)
        .set({ state: CommentState.UserDelete })
        .where(op.eq(schema.chiiEpComments.id, commentID));

      return {};
    },
  );

  app.delete('/subjects/-/episode/-/comments/:commentID', (req, reply) => {
    const params = req.params as Record<string, string>;
    const commentID = params.commentID ?? '';
    return reply.redirect(`/p1/subjects/-/episodes/-/comments/${commentID}`, 307);
  });
}
