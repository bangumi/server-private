import { Type as t } from '@sinclair/typebox';

import { db, op } from '@app/drizzle/db.ts';
import * as schema from '@app/drizzle/schema';
import { NotAllowedError } from '@app/lib/auth/index.ts';
import { Comment, CommentTarget } from '@app/lib/comment';
import { NotFoundError } from '@app/lib/error.ts';
import { Security, Tag } from '@app/lib/openapi/index.ts';
import { CommentState } from '@app/lib/topic/type.ts';
import * as fetcher from '@app/lib/types/fetcher.ts';
import * as req from '@app/lib/types/req.ts';
import * as res from '@app/lib/types/res.ts';
import { requireLogin } from '@app/routes/hooks/pre-handler.ts';
import type { App } from '@app/routes/type.ts';

// eslint-disable-next-line @typescript-eslint/require-await
export async function setup(app: App) {
  const comment = new Comment(CommentTarget.Episode);

  app.get(
    '/episodes/:episodeID',
    {
      schema: {
        operationId: 'getSubjectEpisode',
        summary: '获取剧集信息',
        tags: [Tag.Episode],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          episodeID: t.Integer({ examples: [1075440] }),
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
      if (auth.login) {
        const epStatus = await fetcher.fetchSubjectEpStatus(auth.userID, ep.subjectID);
        ep.status = epStatus[episodeID]?.type;
      }
      return ep;
    },
  );

  app.get(
    '/episodes/:episodeID/comments',
    {
      schema: {
        operationId: 'getSubjectEpisodeComments',
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
      const ep = await fetcher.fetchSlimEpisodeByID(episodeID);
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
        operationId: 'createSubjectEpComment',
        summary: '创建条目的剧集吐槽',
        tags: [Tag.Episode],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          episodeID: t.Integer({ examples: [1075440] }),
        }),
        body: req.Ref(req.CreateEpisodeComment),
        response: {
          200: t.Object({
            id: t.Integer({ description: 'new reply id' }),
          }),
        },
      },
      preHandler: [requireLogin('creating a comment')],
    },
    async ({ auth, body, params: { episodeID } }) => {
      const ep = await fetcher.fetchSlimEpisodeByID(episodeID);
      if (!ep) {
        throw new NotFoundError(`episode ${episodeID}`);
      }
      return await comment.create(episodeID, auth, body);
    },
  );

  app.put(
    '/episodes/-/comments/:commentID',
    {
      schema: {
        operationId: 'updateSubjectEpComment',
        summary: '编辑条目的剧集吐槽',
        tags: [Tag.Episode],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          commentID: t.Integer({ examples: [1075440] }),
        }),
        body: req.Ref(req.UpdateEpisodeComment),
        response: {
          200: t.Object({}),
        },
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

  app.delete(
    '/episodes/-/comments/:commentID',
    {
      schema: {
        operationId: 'deleteSubjectEpComment',
        summary: '删除条目的剧集吐槽',
        tags: [Tag.Episode],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          commentID: t.Integer({ examples: [1034989] }),
        }),
        response: {
          200: t.Object({}),
        },
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
}
