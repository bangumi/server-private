import type { Static } from '@sinclair/typebox';
import { Type as t } from '@sinclair/typebox';
import { DateTime } from 'luxon';

import { NotAllowedError } from '@app/lib/auth';
import { Dam } from '@app/lib/dam';
import { BadRequestError, NotFoundError } from '@app/lib/error';
import * as Notify from '@app/lib/notify';
import { Security, Tag } from '@app/lib/openapi';
import type { IBaseReply } from '@app/lib/orm';
import { GroupRepo } from '@app/lib/orm';
import * as orm from '@app/lib/orm';
import { CommentState, NotJoinPrivateGroupError } from '@app/lib/topic';
import * as Topic from '@app/lib/topic';
import { formatErrors, toResUser } from '@app/lib/types/res';
import * as res from '@app/lib/types/res';
import { requireLogin } from '@app/routes/hooks/pre-handler';
import type { App } from '@app/routes/type';

// eslint-disable-next-line @typescript-eslint/require-await
export async function setup(app: App) {
  app.addSchema(res.Error);
  app.addSchema(res.User);
  const BasicReply = t.Object(
    {
      id: t.Integer(),
      creator: t.Ref(res.User),
      createdAt: t.Integer(),
      text: t.String(),
      state: t.Integer(),
    },
    { $id: 'BasicReply' },
  );

  app.addSchema(BasicReply);

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

  app.post(
    '/groups/-/topics/:topicID/replies',
    {
      schema: {
        operationId: 'createGroupReply',
        params: t.Object({
          topicID: t.Integer({ examples: [371602] }),
        }),
        tags: [Tag.Group],
        response: {
          200: t.Ref(BasicReply),
          401: t.Ref(res.Error, {
            'x-examples': formatErrors(NotJoinPrivateGroupError('沙盒')),
          }),
        },
        security: [{ [Security.CookiesSession]: [] }],
        body: t.Object(
          {
            replyTo: t.Optional(
              t.Integer({
                examples: [0],
                default: 0,
                description: '被回复的 topic ID, `0` 代表回复楼主',
              }),
            ),
            content: t.String({ minLength: 1 }),
          },
          {
            examples: [
              { content: 'post contents' },
              {
                content: 'post contents',
                replyTo: 2,
              },
            ],
          },
        ),
      },
      preHandler: [requireLogin('creating a reply')],
    },
    /**
     * @param auth -
     * @param content - 回帖内容
     * @param relatedID - 子回复时的父回复ID，默认为 `0` 代表回复帖子
     * @param topicID - 帖子 ID
     */
    async ({
      auth,
      body: { content, replyTo = 0 },
      params: { topicID },
    }): Promise<Static<typeof BasicReply>> => {
      if (auth.permission.ban_post) {
        throw new NotAllowedError('create reply');
      }

      const topic = await Topic.fetchDetail(auth, 'group', topicID);
      if (!topic) {
        throw new NotFoundError(`topic ${topicID}`);
      }
      if (topic.state === CommentState.AdminCloseTopic) {
        throw new NotAllowedError('reply to a closed topic');
      }

      const now = DateTime.now();

      let parentID = 0;
      let dstUserID = topic.creatorID;
      if (replyTo) {
        const parents: Record<number, IBaseReply> = Object.fromEntries(
          topic.replies.flatMap((x): [number, IBaseReply][] => {
            // 管理员操作不能回复
            if (
              [
                CommentState.AdminCloseTopic,
                CommentState.AdminReopen,
                CommentState.AdminSilentTopic,
              ].includes(x.state)
            ) {
              return [];
            }
            return [[x.id, x], ...x.replies.map((x): [number, IBaseReply] => [x.id, x])];
          }),
        );

        const replied = parents[replyTo];

        if (!replied) {
          throw new NotFoundError(`parent post id ${replyTo}`);
        }

        dstUserID = replied.creatorID;
        parentID = replied.repliedTo || replied.id;
      }

      const group = await GroupRepo.findOneOrFail({
        where: { id: topic.parentID },
      });

      if (!group.accessible && !(await orm.isMemberInGroup(group.id, auth.userID))) {
        throw new NotJoinPrivateGroupError(group.name);
      }

      const t = await Topic.createTopicReply({
        topicType: Topic.Type.group,
        topicID: topicID,
        userID: auth.userID,
        content,
        parentID,
      });

      const notifyType = replyTo === 0 ? Notify.Type.GroupTopicReply : Notify.Type.GroupPostReply;
      await Notify.create({
        destUserID: dstUserID,
        sourceUserID: auth.userID,
        now,
        type: notifyType,
        postID: t.id,
        topicID: topic.id,
        title: topic.title,
      });

      return {
        id: t.id,
        state: t.state,
        createdAt: t.createdAt,
        text: t.content,
        creator: toResUser(t.user),
      };
    },
  );
}
