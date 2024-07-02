import type { Static } from '@sinclair/typebox';
import { Type as t } from '@sinclair/typebox';
import { DateTime } from 'luxon';

import type { IAuth } from '@app/lib/auth/index.ts';
import { NotAllowedError } from '@app/lib/auth/index.ts';
import { Dam } from '@app/lib/dam.ts';
import { BadRequestError, NotFoundError } from '@app/lib/error.ts';
import * as Notify from '@app/lib/notify.ts';
import { Security, Tag } from '@app/lib/openapi/index.ts';
import type { entity, IBaseReply } from '@app/lib/orm/index.ts';
import { EpisodeCommentRepo, fetchUser, fetchUserX, GroupRepo } from '@app/lib/orm/index.ts';
import * as orm from '@app/lib/orm/index.ts';
import { avatar } from '@app/lib/response';
import { CommentState, NotJoinPrivateGroupError, Type } from '@app/lib/topic/index.ts';
import * as Topic from '@app/lib/topic/index.ts';
import { formatErrors, toResUser } from '@app/lib/types/res.ts';
import * as res from '@app/lib/types/res.ts';
import { requireLogin } from '@app/routes/hooks/pre-handler.ts';
import type { App } from '@app/routes/type.ts';

const BaseEpisodeComment = t.Object(
  {
    id: t.Integer(),
    epID: t.Integer(),
    creatorID: t.Integer(),
    relatedID: t.Integer(),
    createdAt: t.Integer(),
    content: t.String(),
    state: t.Integer(),
    user: t.Union([
      t.Object({
        id: t.Integer(),
        nickname: t.String(),
        avatar: t.Object({
          small: t.String(),
          medium: t.String(),
          large: t.String(),
        }),
      }),
      t.Null(),
    ]),
  },
  {
    $id: 'BaseEpisodeComment',
  },
);

type IEpisodeComment = Static<typeof EpisodeComment>;
const EpisodeComment = t.Intersect(
  [
    BaseEpisodeComment,
    t.Object({
      replies: t.Array(t.Ref(BaseEpisodeComment)),
    }),
  ],
  { $id: 'EpisodeComments' },
);

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

  const Reply = t.Object(
    {
      ...BasicReply.properties,
      topicID: t.Integer(),
      topicTitle: t.String(),
    },
    { $id: 'GroupReply' },
  );

  app.addSchema(BasicReply);
  app.addSchema(Reply);

  async function getPost(auth: IAuth, postID: number, type: Type) {
    let post: entity.GroupPost | entity.SubjectPost | null;
    switch (type) {
      case Type.group: {
        post = await orm.GroupPostRepo.findOneBy({ id: postID });
        break;
      }
      case Type.subject: {
        post = await orm.SubjectPostRepo.findOneBy({ id: postID });
        break;
      }
      default: {
        post = null;
      }
    }

    if (!post) {
      throw new NotFoundError(`${type} post ${postID}`);
    }

    if ([Topic.CommentState.UserDelete, Topic.CommentState.AdminDelete].includes(post.state)) {
      throw new NotFoundError(`${type} post ${postID}`);
    }

    const topic = await Topic.fetchDetail(auth, type, post.topicID);
    if (!topic) {
      throw new NotFoundError(`${type} topic ${post.topicID}`);
    }

    if (topic.contentPost.id === post.id) {
      throw new NotFoundError(`${type} post ${postID}`);
    }

    if ([Topic.CommentState.UserDelete, Topic.CommentState.AdminDelete].includes(topic.state)) {
      throw new NotFoundError(`${type} topic ${post.topicID}`);
    }

    return { post, topic };
  }

  app.addSchema(EpisodeComment);
  app.get(
    '/subjects/-/episode/:episodeID/comments',
    {
      schema: {
        summary: '获取条目的剧集评论',
        tags: [Tag.Subject],
        operationId: 'getSubjectEpisodeComments',
        params: t.Object({
          episodeID: t.Integer({ examples: [1075440], minimum: 0 }),
        }),
        security: [{ [Security.CookiesSession]: [] }],
        response: {
          200: t.Array(EpisodeComment),
        },
      },
    },
    async ({ params: { episodeID } }): Promise<IEpisodeComment[]> => {
      const comments = await EpisodeCommentRepo.find({ where: { epID: episodeID } });
      if (!comments) {
        throw new NotFoundError(`comments of ep id ${episodeID}`);
      }

      const commentMap: Map<number, IEpisodeComment> = new Map();
      const repliesMap: Map<number, IEpisodeComment[]> = new Map();

      for (const comment of comments) {
        const u = await fetchUser(comment.creatorID);
        const baseComment = comments
          .map((v) => ({
            id: v.id,
            epID: v.epID,
            creatorID: v.creatorID,
            relatedID: v.relatedID,
            createdAt: v.createdAt,
            content: v.content,
            state: v.state,
            user: u
              ? {
                  id: u.id,
                  nickname: u.nickname,
                  avatar: avatar(u.img),
                }
              : null,
            replies: [],
          }))
          .find((p) => p.id === comment.id);
        if (!baseComment) {
          continue;
        }

        if (comment.relatedID === 0) {
          commentMap.set(comment.id, baseComment);
        } else {
          const relatedReplies = repliesMap.get(comment.relatedID) ?? [];
          relatedReplies.push(baseComment);
          repliesMap.set(comment.relatedID, relatedReplies);
        }
      }
      for (const [id, replies] of repliesMap.entries()) {
        const mainPost = commentMap.get(id);
        if (mainPost) {
          mainPost.replies = replies;
        }
      }

      return [...commentMap.values()];
    },
  );

  app.get(
    '/groups/-/posts/:postID',
    {
      schema: {
        operationId: 'getGroupPost',
        params: t.Object({
          postID: t.Integer({ examples: [2092074] }),
        }),
        tags: [Tag.Group],
        response: {
          200: t.Ref(Reply),
          404: t.Ref(res.Error, {
            'x-examples': formatErrors(NotFoundError('post')),
          }),
        },
        security: [{ [Security.CookiesSession]: [] }],
      },
    },
    async ({ auth, params: { postID } }): Promise<Static<typeof Reply>> => {
      const { topic, post } = await getPost(auth, postID, Type.group);

      const creator = res.toResUser(await fetchUserX(post.uid));

      return {
        id: postID,
        creator,
        topicID: topic.id,
        state: post.state,
        createdAt: post.dateline,
        text: post.content,
        topicTitle: topic.title,
      };
    },
  );

  app.put(
    '/groups/-/posts/:postID',
    {
      schema: {
        operationId: 'editGroupPost',
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

      const topic = await Topic.fetchDetail(auth, Type.group, post.topicID);
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

  app.delete(
    '/groups/-/posts/:postID',
    {
      schema: {
        operationId: 'deleteGroupPost',
        params: t.Object({
          postID: t.Integer({ examples: [2092074] }),
        }),
        tags: [Tag.Group],
        response: {
          200: t.Object({}),
          401: t.Ref(res.Error, {
            'x-examples': formatErrors(NotAllowedError('delete this post')),
          }),
          404: t.Ref(res.Error, {
            'x-examples': formatErrors(NotFoundError('post')),
          }),
        },
        security: [{ [Security.CookiesSession]: [] }],
      },
      preHandler: [requireLogin('delete a post')],
    },
    async ({ auth, params: { postID } }) => {
      const { post } = await getPost(auth, postID, Type.group);

      if (auth.userID !== post.uid) {
        throw new NotAllowedError('delete this post');
      }

      if (post.state !== Topic.CommentState.Normal) {
        return {};
      }

      await orm.GroupPostRepo.update({ id: postID }, { state: Topic.CommentState.UserDelete });
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

      const topic = await Topic.fetchDetail(auth, Type.group, topicID);
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

  app.delete(
    '/subjects/-/posts/:postID',
    {
      schema: {
        operationId: 'deleteSubjectPost',
        summary: '删除自己创建的条目讨论版回复',
        params: t.Object({
          postID: t.Integer({ examples: [2092074] }),
        }),
        tags: [Tag.Subject],
        response: {
          200: t.Object({}),
          401: t.Ref(res.Error, {
            'x-examples': formatErrors(NotAllowedError('delete this post')),
          }),
          404: t.Ref(res.Error, {
            'x-examples': formatErrors(NotFoundError('post')),
          }),
        },
        security: [{ [Security.CookiesSession]: [] }],
      },
      preHandler: [requireLogin('delete a post')],
    },
    async ({ auth, params: { postID } }) => {
      const { post } = await getPost(auth, postID, Type.subject);

      if (auth.userID !== post.uid) {
        throw new NotAllowedError('delete this post');
      }

      if (post.state !== Topic.CommentState.Normal) {
        return {};
      }

      await orm.SubjectPostRepo.update({ id: postID }, { state: Topic.CommentState.UserDelete });
      return {};
    },
  );

  app.get(
    '/subjects/-/posts/:postID',
    {
      schema: {
        operationId: 'getSubjectPost',
        summary: '获取指定的条目讨论版回复',
        params: t.Object({
          postID: t.Integer({ examples: [2092074] }),
        }),
        tags: [Tag.Subject],
        response: {
          200: t.Ref(Reply),
          404: t.Ref(res.Error, {
            'x-examples': formatErrors(NotFoundError('post')),
          }),
        },
        security: [{ [Security.CookiesSession]: [] }],
      },
    },
    async ({ auth, params: { postID } }): Promise<Static<typeof Reply>> => {
      const { topic, post } = await getPost(auth, postID, Type.subject);

      const creator = res.toResUser(await fetchUserX(post.uid));

      return {
        id: postID,
        creator,
        topicID: topic.id,
        state: post.state,
        createdAt: post.dateline,
        text: post.content,
        topicTitle: topic.title,
      };
    },
  );

  app.put(
    '/subjects/-/posts/:postID',
    {
      schema: {
        summary: '编辑自己创建的条目讨论版回复',
        operationId: 'editSubjectPost',
        params: t.Object({
          postID: t.Integer({ examples: [2092074] }),
        }),
        tags: [Tag.Subject],
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

      const post = await orm.SubjectPostRepo.findOneBy({ id: postID });
      if (!post) {
        throw new NotFoundError(`post ${postID}`);
      }

      if (post.uid !== auth.userID) {
        throw new NotAllowedError('edit reply not created by you');
      }

      const topic = await Topic.fetchDetail(auth, Type.subject, post.topicID);
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

      await orm.SubjectPostRepo.update({ id: postID }, { content: text });

      return {};
    },
  );

  // app.post(
  //   '/subjects/-/topics/:topicID/replies',
  //   {
  //     schema: {
  //       summary: '创建条目讨论版回复',
  //       operationId: 'createSubjectReply',
  //       params: t.Object({
  //         topicID: t.Integer({ examples: [371602] }),
  //       }),
  //       tags: [Tag.Subject],
  //       response: {
  //         200: t.Ref(BasicReply),
  //         401: t.Ref(res.Error, {
  //           'x-examples': formatErrors(NotJoinPrivateGroupError('沙盒')),
  //         }),
  //       },
  //       security: [{ [Security.CookiesSession]: [] }],
  //       body: t.Object(
  //         {
  //           replyTo: t.Optional(
  //             t.Integer({
  //               examples: [0],
  //               default: 0,
  //               description: '被回复的 topic ID, `0` 代表回复楼主',
  //             }),
  //           ),
  //           content: t.String({ minLength: 1 }),
  //         },
  //         {
  //           examples: [
  //             { content: 'post contents' },
  //             {
  //               content: 'post contents',
  //               replyTo: 2,
  //             },
  //           ],
  //         },
  //       ),
  //     },
  //     preHandler: [requireLogin('creating a reply')],
  //   },
  //   /**
  //    * @param auth -
  //    * @param content - 回帖内容
  //    * @param relatedID - 子回复时的父回复ID，默认为 `0` 代表回复帖子
  //    * @param topicID - 帖子 ID
  //    */
  //   async ({
  //     auth,
  //     body: { content, replyTo = 0 },
  //     params: { topicID },
  //   }): Promise<Static<typeof BasicReply>> => {
  //     if (auth.permission.ban_post) {
  //       throw new NotAllowedError('create reply');
  //     }

  //     const topic = await Topic.fetchDetail(auth, 'subject', topicID);
  //     if (!topic) {
  //       throw new NotFoundError(`topic ${topicID}`);
  //     }
  //     if (topic.state === CommentState.AdminCloseTopic) {
  //       throw new NotAllowedError('reply to a closed topic');
  //     }

  //     const now = DateTime.now();

  //     let parentID = 0;
  //     let dstUserID = topic.creatorID;
  //     if (replyTo) {
  //       const parents: Record<number, IBaseReply> = Object.fromEntries(
  //         topic.replies.flatMap((x): [number, IBaseReply][] => {
  //           // 管理员操作不能回复
  //           if (
  //             [
  //               CommentState.AdminCloseTopic,
  //               CommentState.AdminReopen,
  //               CommentState.AdminSilentTopic,
  //             ].includes(x.state)
  //           ) {
  //             return [];
  //           }
  //           return [[x.id, x], ...x.replies.map((x): [number, IBaseReply] => [x.id, x])];
  //         }),
  //       );

  //       const replied = parents[replyTo];

  //       if (!replied) {
  //         throw new NotFoundError(`parent post id ${replyTo}`);
  //       }

  //       dstUserID = replied.creatorID;
  //       parentID = replied.repliedTo || replied.id;
  //     }

  //     const t = await Topic.createTopicReply({
  //       topicType: Topic.Type.subject,
  //       topicID: topicID,
  //       userID: auth.userID,
  //       content,
  //       parentID,
  //     });

  //     const notifyType =
  //       replyTo === 0 ? Notify.Type.SubjectTopicReply : Notify.Type.SubjectPostReply;
  //     await Notify.create({
  //       destUserID: dstUserID,
  //       sourceUserID: auth.userID,
  //       now,
  //       type: notifyType,
  //       postID: t.id,
  //       topicID: topic.id,
  //       title: topic.title,
  //     });

  //     return {
  //       id: t.id,
  //       state: t.state,
  //       createdAt: t.createdAt,
  //       text: t.content,
  //       creator: toResUser(t.user),
  //     };
  //   },
  // );

  type ISubjectInterestComment = Static<typeof SubjectInterestComment>;
  const SubjectInterestComment = t.Object(
    {
      total: t.Integer(),
      list: t.Array(
        t.Object({
          user: t.Union([
            t.Object({
              id: t.Integer(),
              nickname: t.String(),
              avatar: t.Object({
                small: t.String(),
                medium: t.String(),
                large: t.String(),
              }),
            }),
            t.Null(),
          ]),
          rate: t.Integer(),
          comment: t.String(),
          updatedAt: t.Integer(),
        }),
      ),
    },
    { $id: 'SubjectInterestComment' },
  );

  app.addSchema(SubjectInterestComment);

  app.get(
    '/subjects/:subjectID/comments',
    {
      schema: {
        summary: '获取条目的吐槽箱',
        tags: [Tag.Subject],
        operationId: 'subjectComments',
        params: t.Object({
          subjectID: t.Integer({ examples: [8], minimum: 0 }),
        }),
        querystring: t.Object({
          limit: t.Optional(t.Integer({ default: 20 })),
          offset: t.Optional(t.Integer({ default: 0, minimum: 0 })),
        }),
        security: [{ [Security.CookiesSession]: [] }],
        response: {
          200: t.Ref(SubjectInterestComment),
        },
      },
    },
    async ({ params: { subjectID }, query }): Promise<ISubjectInterestComment> => {
      const where = { subjectID: subjectID, private: 0, hasComment: 1 };

      const count = await orm.SubjectInterestRepo.count({ where });
      const comments = await orm.SubjectInterestRepo.find({
        where: where,
        skip: query.offset,
        take: query.limit,
      });

      const commentPromises = comments.map(async (v) => {
        const u = await fetchUser(v.uid);
        return {
          user: u
            ? {
                id: u.id,
                nickname: u.nickname,
                avatar: avatar(u.img),
              }
            : null,
          rate: v.rate,
          comment: v.comment,
          updatedAt: v.lastTouch,
        };
      });

      return {
        total: count,
        list: await Promise.all(commentPromises),
      };
    },
  );
}
