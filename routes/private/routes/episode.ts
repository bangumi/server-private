import { Type as t } from '@sinclair/typebox';

import { db, op, schema } from '@app/drizzle';
import { CommentWithState } from '@app/lib/comment';
import { NotFoundError } from '@app/lib/error.ts';
import { addReaction, deleteReaction, LikeType } from '@app/lib/like';
import { Security, Tag } from '@app/lib/openapi/index.ts';
import { getEpStatus } from '@app/lib/subject/utils';
import * as fetcher from '@app/lib/types/fetcher.ts';
import * as req from '@app/lib/types/req.ts';
import * as res from '@app/lib/types/res.ts';
import { requireLogin, requireTurnstileToken } from '@app/routes/hooks/pre-handler.ts';
import type { App } from '@app/routes/type.ts';

// eslint-disable-next-line @typescript-eslint/require-await
export async function setup(app: App) {
  const comment = new CommentWithState(schema.chiiEpComments);

  app.get(
    '/episodes/:episodeID',
    {
      schema: {
        operationId: 'getEpisode',
        summary: '获取剧集信息',
        tags: [Tag.Episode],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          episodeID: t.Integer({ minimum: 1 }),
        }),
        response: {
          200: res.Ref(res.Episode),
        },
      },
    },
    async ({ auth, params: { episodeID } }): Promise<res.IEpisode> => {
      const ep = await fetcher.fetchEpisodeByID(episodeID);
      if (!ep) {
        throw new NotFoundError(`episode ${episodeID}`);
      }
      const subject = await fetcher.fetchSubjectByID(ep.subjectID, auth.allowNsfw);
      if (!subject) {
        throw new NotFoundError(`subject ${ep.subjectID}`);
      }
      ep.subject = subject;
      if (auth.login) {
        const epStatus = await getEpStatus(auth.userID, ep.subjectID);
        ep.status = epStatus[episodeID]?.type;
      }
      return ep;
    },
  );

  app.get(
    '/episodes/:episodeID/comments',
    {
      schema: {
        operationId: 'getEpisodeComments',
        summary: '获取条目的剧集吐槽箱',
        tags: [Tag.Episode],
        params: t.Object({
          episodeID: t.Integer({ minimum: 1 }),
        }),
        response: {
          200: t.Array(res.Comment),
        },
      },
    },
    async ({ params: { episodeID } }): Promise<res.IComment[]> => {
      const ep = await fetcher.fetchEpisodeByID(episodeID);
      if (!ep) {
        throw new NotFoundError(`episode ${episodeID}`);
      }
      return await comment.getAll(episodeID);
    },
  );

  app.post(
    '/episodes/:episodeID/comments',
    {
      schema: {
        operationId: 'createEpisodeComment',
        summary: '创建条目的剧集吐槽',
        tags: [Tag.Episode],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          episodeID: t.Integer({ minimum: 1 }),
        }),
        body: t.Intersect([req.Ref(req.CreateReply), req.Ref(req.TurnstileToken)]),
        response: {
          200: t.Object({
            id: t.Integer({ description: 'new comment id' }),
          }),
        },
      },
      preHandler: [requireLogin('creating a comment'), requireTurnstileToken()],
    },
    async ({ auth, body: { content, replyTo = 0 }, params: { episodeID } }) => {
      const ep = await fetcher.fetchEpisodeByID(episodeID);
      if (!ep) {
        throw new NotFoundError(`episode ${episodeID}`);
      }
      return await comment.create(auth, episodeID, content, replyTo);
    },
  );

  app.post(
    '/episodes/-/comments/:commentID/like',
    {
      schema: {
        summary: '给条目的剧集吐槽点赞',
        operationId: 'likeEpisodeComment',
        tags: [Tag.Episode],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          commentID: t.Integer(),
        }),
        body: t.Object({
          value: t.Integer(),
        }),
        response: {
          200: t.Object({}),
        },
      },
      preHandler: [requireLogin('liking a episode comment')],
    },
    async ({ auth, params: { commentID }, body: { value } }) => {
      const [comment] = await db
        .select({ mid: schema.chiiEpComments.mid })
        .from(schema.chiiEpComments)
        .where(op.eq(schema.chiiEpComments.id, commentID))
        .limit(1);
      if (!comment) {
        throw new NotFoundError(`comment ${commentID}`);
      }
      await addReaction({
        type: LikeType.EpisodeReply,
        mid: comment.mid,
        rid: commentID,
        uid: auth.userID,
        value,
      });
      return {};
    },
  );

  app.delete(
    '/episodes/-/comments/:commentID/like',
    {
      schema: {
        summary: '取消条目的剧集吐槽点赞',
        operationId: 'unlikeEpisodeComment',
        tags: [Tag.Episode],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          commentID: t.Integer(),
        }),
        response: {
          200: t.Object({}),
        },
      },
      preHandler: [requireLogin('liking a episode comment')],
    },
    async ({ auth, params: { commentID } }) => {
      await deleteReaction({
        type: LikeType.EpisodeReply,
        rid: commentID,
        uid: auth.userID,
      });
      return {};
    },
  );

  app.put(
    '/episodes/-/comments/:commentID',
    {
      schema: {
        operationId: 'updateEpisodeComment',
        summary: '编辑条目的剧集吐槽',
        tags: [Tag.Episode],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          commentID: t.Integer({ minimum: 1 }),
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
    '/episodes/-/comments/:commentID',
    {
      schema: {
        operationId: 'deleteEpisodeComment',
        summary: '删除条目的剧集吐槽',
        tags: [Tag.Episode],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          commentID: t.Integer({ minimum: 1 }),
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
