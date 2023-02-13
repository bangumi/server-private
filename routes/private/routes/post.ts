import { Type as t } from '@sinclair/typebox';

import { NotAllowedError } from '@app/lib/auth';
import { Dam, dam } from '@app/lib/dam';
import { BadRequestError, NotFoundError } from '@app/lib/error';
import { Security, Tag } from '@app/lib/openapi';
import * as orm from '@app/lib/orm';
import * as Topic from '@app/lib/topic';
import { CommentState, TopicDisplay } from '@app/lib/topic';
import * as res from '@app/lib/types/res';
import { formatErrors } from '@app/lib/types/res';
import { requireLogin } from '@app/routes/hooks/pre-handler';
import type { App } from '@app/routes/type';

// eslint-disable-next-line @typescript-eslint/require-await
export async function setup(app: App) {
  app.addSchema(res.Error);

  app.put(
    '/groups/-/posts/:postID',
    {
      schema: {
        operationId: 'editGroupReply',
        params: t.Object({
          postID: t.Integer({ examples: [2092074] }),
        }),
        tags: [Tag.Group],
        response: {
          200: t.Object({}),
          401: t.Ref(res.Error, {
            'x-examples': formatErrors(NotAllowedError('edit reply')),
          }),
        },
        security: [{ [Security.CookiesSession]: [] }],
        body: t.Object(
          {
            text: t.String({ minLength: 1 }),
          },
          {
            examples: [{ text: 'new post contents' }],
          },
        ),
      },
      preHandler: [requireLogin('edit a post')],
    },
    /**
     * @param auth -
     * @param text - 回帖内容
     * @param postID - 回复 ID
     */
    async function ({ auth, body: { text }, params: { postID } }): Promise<Record<string, never>> {
      if (auth.permission.ban_post) {
        throw new NotAllowedError('create reply');
      }

      if (!Dam.allCharacterPrintable(text)) {
        throw new BadRequestError('text contains invalid invisible character');
      }

      const post = await orm.GroupPostRepo.findOneBy({ id: postID });
      if (!post) {
        throw new NotFoundError(`post ${postID}`);
      }

      if (post.uid !== auth.userID) {
        throw new NotAllowedError('edit reply not created by you');
      }

      const topic = await Topic.fetchDetail(auth, 'group', post.topicID);
      if (!topic) {
        throw new NotFoundError(`topic ${post.topicID}`);
      }

      if (topic.state === CommentState.AdminCloseTopic) {
        throw new NotAllowedError('edit reply in a closed topic');
      }

      if ([CommentState.AdminDelete, CommentState.UserDelete].includes(topic.state)) {
        throw new NotAllowedError('edit a deleted reply');
      }

      for (const reply of topic.replies) {
        if (reply.id === post.id && reply.replies.length > 0) {
          throw new NotAllowedError('edit a reply with sub-reply');
        }
      }

      await orm.GroupPostRepo.update({ id: postID }, { content: text });

      return {};
    },
  );

  app.put(
    '/groups/-/topics/:topicID',
    {
      schema: {
        operationId: 'editGroupTopic',
        params: t.Object({
          topicID: t.Integer({ examples: [371602] }),
        }),
        tags: [Tag.Group],
        response: {
          200: t.Object({}),
          400: t.Ref(res.Error),
          401: t.Ref(res.Error, {
            'x-examples': formatErrors(NotAllowedError('edit a topic')),
          }),
        },
        security: [{ [Security.CookiesSession]: [] }],
        body: t.Object(
          {
            title: t.String({ minLength: 1 }),
            text: t.String({ minLength: 1 }),
          },
          {
            examples: [{ title: 'new topic title', text: 'new contents' }],
          },
        ),
      },
      preHandler: [requireLogin('edit a topic')],
    },
    /**
     * @param auth -
     * @param title - 帖子标题
     * @param text - 帖子内容
     * @param topicID - 帖子 ID
     */
    async function ({
      auth,
      body: { title, text },
      params: { topicID },
    }): Promise<Record<string, never>> {
      if (auth.permission.ban_post) {
        throw new NotAllowedError('create reply');
      }

      if (!(Dam.allCharacterPrintable(title) && Dam.allCharacterPrintable(text))) {
        throw new BadRequestError('text contains invalid invisible character');
      }

      const topic = await Topic.fetchDetail(auth, 'group', topicID);
      if (!topic) {
        throw new NotFoundError(`topic ${topicID}`);
      }

      if (
        ![CommentState.AdminReopen, CommentState.AdminPin, CommentState.Normal].includes(
          topic.state,
        )
      ) {
        throw new NotAllowedError('edit this topic');
      }

      if (topic.creatorID !== auth.userID) {
        throw new NotAllowedError('edit this topic');
      }

      let display = topic.display;
      if (dam.needReview(title) || dam.needReview(text)) {
        if (display === TopicDisplay.Normal) {
          display = TopicDisplay.Review;
        } else {
          return {};
        }
      }

      await orm.GroupTopicRepo.update({ id: topicID }, { title, display });

      const topicPost = await orm.GroupPostRepo.findOneBy({ topicID });

      if (topicPost) {
        await orm.GroupPostRepo.update({ id: topicPost.id }, { content: text });
      }

      return {};
    },
  );
}
