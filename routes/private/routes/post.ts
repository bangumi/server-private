import type { Static } from '@sinclair/typebox';
import { Type as t } from '@sinclair/typebox';
import { DateTime } from 'luxon';

import type { IAuth } from '@app/lib/auth/index.ts';
import { NotAllowedError } from '@app/lib/auth/index.ts';
import config from '@app/lib/config';
import { Dam } from '@app/lib/dam.ts';
import { BadRequestError, CaptchaError, NotFoundError } from '@app/lib/error.ts';
import { Security, Tag } from '@app/lib/openapi/index.ts';
import type { entity } from '@app/lib/orm/index.ts';
import { EpisodeCommentRepo, EpisodeRepo, fetchUserX } from '@app/lib/orm/index.ts';
import * as orm from '@app/lib/orm/index.ts';
import { createTurnstileDriver } from '@app/lib/services/turnstile';
import {
  CommentState,
  handleTopicReply,
  NotJoinPrivateGroupError,
  Type,
} from '@app/lib/topic/index.ts';
import * as Topic from '@app/lib/topic/index.ts';
import * as convert from '@app/lib/types/convert.ts';
import { formatErrors } from '@app/lib/types/res.ts';
import * as res from '@app/lib/types/res.ts';
import { LimitAction } from '@app/lib/utils/rate-limit';
import { requireLogin } from '@app/routes/hooks/pre-handler.ts';
import { rateLimiter } from '@app/routes/hooks/rate-limit';
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
    user: t.Ref(res.User),
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

export type IBasicReply = Static<typeof BasicReply>;
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

// eslint-disable-next-line @typescript-eslint/require-await
export async function setup(app: App) {
  app.addSchema(res.Error);
  app.addSchema(res.User);
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

    const topic = await Topic.fetchTopicDetail(auth, type, post.topicID);
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
        summary: '获取条目的剧集吐槽箱',
        tags: [Tag.Subject],
        operationId: 'getSubjectEpisodeComments',
        params: t.Object({
          episodeID: t.Integer({ examples: [1075440], minimum: 0 }),
        }),
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

      const commentMap = new Map<number, IEpisodeComment>();
      const repliesMap = new Map<number, IEpisodeComment[]>();

      for (const comment of comments) {
        const u = await fetchUserX(comment.creatorID);
        const baseComment = comments
          .map((v) => ({
            id: v.id,
            epID: v.epID,
            creatorID: v.creatorID,
            relatedID: v.relatedID,
            createdAt: v.createdAt,
            content: v.content,
            state: v.state,
            user: convert.oldToUser(u),
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

  const turnstile = createTurnstileDriver(config.turnstile.secretKey);

  app.post(
    '/subjects/-/episode/:episodeID/comments',
    {
      schema: {
        summary: '创建条目的剧集吐槽',
        operationId: 'createSubjectEpComment',
        description: `需要 [turnstile](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/)

next.bgm.tv 域名对应的 site-key 为 \`0x4AAAAAAABkMYinukE8nzYS\`

dev.bgm38.com 域名使用测试用的 site-key \`1x00000000000000000000AA\``,
        params: t.Object({
          episodeID: t.Integer({ examples: [1075440] }),
        }),
        tags: [Tag.Subject],
        response: {
          200: t.Ref(BasicReply),
        },
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        body: t.Object(
          {
            replyTo: t.Optional(
              t.Integer({
                examples: [0],
                default: 0,
                description: '被回复的吐槽 ID, `0` 代表发送顶层吐槽',
              }),
            ),
            content: t.String({ minLength: 1 }),
            'cf-turnstile-response': t.String({ minLength: 1 }),
          },
          {
            examples: [
              {
                content: 'comment contents',
                'cf-turnstile-response': '10000000-aaaa-bbbb-cccc-000000000001',
              },
              {
                content: 'comment contents',
                replyTo: 2,
                'cf-turnstile-response': '10000000-aaaa-bbbb-cccc-000000000001',
              },
            ],
          },
        ),
      },
      preHandler: [requireLogin('creating a comment'), rateLimiter(LimitAction.Subject)],
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
    }): Promise<Static<typeof BasicReply>> => {
      if (!(await turnstile.verify(cfCaptchaResponse))) {
        throw new CaptchaError();
      }

      if (!Dam.allCharacterPrintable(content)) {
        throw new BadRequestError('text contains invalid invisible character');
      }

      if (auth.permission.ban_post) {
        throw new NotAllowedError('create comment');
      }

      const ep = await EpisodeRepo.findOne({ where: { id: episodeID } });
      if (!ep) {
        throw new NotFoundError(`episode ${episodeID}`);
      }
      if (ep.epBan !== 0) {
        throw new NotAllowedError('comment to a closed episode');
      }

      if (replyTo !== 0) {
        const replied = await EpisodeCommentRepo.findOne({ where: { id: replyTo } });
        if (!replied) {
          throw new NotFoundError(`parent comment id ${replyTo}`);
        }
        if (replied.state !== CommentState.Normal) {
          throw new NotAllowedError(`reply to a abnormal state comment`);
        }
      }

      const c = await EpisodeCommentRepo.save({
        content: content,
        creatorID: auth.userID,
        epID: episodeID,
        relatedID: replyTo,
        createdAt: DateTime.now().toUnixInteger(),
        state: CommentState.Normal,
      });

      return {
        id: c.id,
        state: c.state,
        createdAt: c.createdAt,
        text: c.content,
        creator: convert.oldToUser(await fetchUserX(auth.userID)),
      };
    },
  );

  app.put(
    '/subjects/-/episode/-/comments/:commentID',
    {
      schema: {
        summary: '编辑条目的剧集吐槽',
        operationId: 'editSubjectEpComment',
        params: t.Object({
          commentID: t.Integer({ examples: [1075440] }),
        }),
        tags: [Tag.Subject],
        response: {
          200: t.Object({}),
        },
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        body: t.Object(
          {
            content: t.String({ minLength: 1 }),
          },
          {
            examples: [{ content: 'new comment contents' }],
          },
        ),
      },
      preHandler: [requireLogin('edit a comment')],
    },

    async ({ auth, body: { content }, params: { commentID } }) => {
      const comment = await EpisodeCommentRepo.findOne({ where: { id: commentID } });
      if (!comment) {
        throw new NotFoundError(`comment id ${commentID}`);
      }
      if (comment.creatorID !== auth.userID) {
        throw new NotAllowedError('edit a comment which is not yours');
      }
      if (comment.state !== CommentState.Normal) {
        throw new NotAllowedError(`edit to a abnormal state comment`);
      }

      const repliesCount = await EpisodeCommentRepo.count({
        where: { relatedID: commentID },
      });
      if (repliesCount > 0) {
        throw new NotAllowedError('cannot edit a comment with replies');
      }

      await EpisodeCommentRepo.update(
        { id: commentID },
        {
          content: content,
        },
      );

      return {};
    },
  );

  app.delete(
    '/subjects/-/episode/-/comments/:commentID',
    {
      schema: {
        summary: '删除条目的剧集吐槽',
        operationId: 'deleteSubjectEpComment',
        params: t.Object({
          commentID: t.Integer({ examples: [1034989] }),
        }),
        tags: [Tag.Subject],
        response: {
          200: t.Object({}),
          401: t.Ref(res.Error, {
            'x-examples': formatErrors(new NotAllowedError('delete this comment')),
          }),
          404: t.Ref(res.Error, {
            'x-examples': formatErrors(new NotFoundError('comment')),
          }),
        },
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
      },
      preHandler: [requireLogin('delete a comment')],
    },
    async ({ auth, params: { commentID } }) => {
      const comment = await EpisodeCommentRepo.findOne({ where: { id: commentID } });
      if (!comment) {
        throw new NotFoundError(`comment id ${commentID}`);
      }
      if (comment.creatorID !== auth.userID) {
        throw new NotAllowedError('delete a comment which is not yours');
      }
      if (comment.state !== CommentState.Normal) {
        throw new NotAllowedError('delete a abnormal state comment');
      }

      await EpisodeCommentRepo.update({ id: commentID }, { state: CommentState.UserDelete });
      return {};
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
            'x-examples': formatErrors(new NotFoundError('post')),
          }),
        },
        security: [{ [Security.CookiesSession]: [] }],
      },
    },
    async ({ auth, params: { postID } }): Promise<Static<typeof Reply>> => {
      const { topic, post } = await getPost(auth, postID, Type.group);

      const creator = convert.oldToUser(await fetchUserX(post.uid));

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
            'x-examples': formatErrors(new NotAllowedError('edit reply')),
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

      const topic = await Topic.fetchTopicDetail(auth, Type.group, post.topicID);
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
            'x-examples': formatErrors(new NotAllowedError('delete this post')),
          }),
          404: t.Ref(res.Error, {
            'x-examples': formatErrors(new NotFoundError('post')),
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
            'x-examples': formatErrors(new NotJoinPrivateGroupError('沙盒')),
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
            'cf-turnstile-response': t.String({ minLength: 1 }),
          },
          {
            examples: [
              {
                content: 'post contents',
                'cf-turnstile-response': '10000000-aaaa-bbbb-cccc-000000000001',
              },
              {
                content: 'post contents',
                replyTo: 2,
                'cf-turnstile-response': '10000000-aaaa-bbbb-cccc-000000000001',
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
      body: { 'cf-turnstile-response': cfCaptchaResponse, content, replyTo = 0 },
      params: { topicID },
    }): Promise<Static<typeof BasicReply>> => {
      if (!(await turnstile.verify(cfCaptchaResponse))) {
        throw new CaptchaError();
      }
      return await handleTopicReply(auth, Topic.Type.group, topicID, content, replyTo);
    },
  );

  app.post(
    '/subjects/-/topics/:topicID/replies',
    {
      schema: {
        summary: '创建条目讨论版回复',
        operationId: 'createSubjectReply',
        description: `需要 [turnstile](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/)

next.bgm.tv 域名对应的 site-key 为 \`0x4AAAAAAABkMYinukE8nzYS\`

dev.bgm38.com 域名使用测试用的 site-key \`1x00000000000000000000AA\``,
        params: t.Object({
          topicID: t.Integer({ examples: [371602] }),
        }),
        tags: [Tag.Subject],
        response: {
          200: t.Ref(BasicReply),
          401: t.Ref(res.Error, {
            'x-examples': formatErrors(new NotJoinPrivateGroupError('沙盒')),
          }),
        },
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
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
            'cf-turnstile-response': t.String({ minLength: 1 }),
          },
          {
            examples: [
              {
                content: 'post contents',
                'cf-turnstile-response': '10000000-aaaa-bbbb-cccc-000000000001',
              },
              {
                content: 'post contents',
                replyTo: 2,
                'cf-turnstile-response': '10000000-aaaa-bbbb-cccc-000000000001',
              },
            ],
          },
        ),
      },
      preHandler: [requireLogin('creating a reply'), rateLimiter(LimitAction.Subject)],
    },
    /**
     * @param auth -
     * @param content - 回帖内容
     * @param relatedID - 子回复时的父回复ID，默认为 `0` 代表回复帖子
     * @param topicID - 帖子 ID
     */
    async ({
      auth,
      body: { 'cf-turnstile-response': cfCaptchaResponse, content, replyTo = 0 },
      params: { topicID },
    }): Promise<Static<typeof BasicReply>> => {
      if (!(await turnstile.verify(cfCaptchaResponse))) {
        throw new CaptchaError();
      }
      return await handleTopicReply(auth, Topic.Type.subject, topicID, content, replyTo);
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
            'x-examples': formatErrors(new NotAllowedError('delete this post')),
          }),
          404: t.Ref(res.Error, {
            'x-examples': formatErrors(new NotFoundError('post')),
          }),
        },
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
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
        summary: '获取条目讨论版回复',
        params: t.Object({
          postID: t.Integer({ examples: [2092074] }),
        }),
        tags: [Tag.Subject],
        response: {
          200: t.Ref(Reply),
          404: t.Ref(res.Error, {
            'x-examples': formatErrors(new NotFoundError('post')),
          }),
        },
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
      },
      preHandler: [requireLogin('get a posts')],
    },
    async ({ auth, params: { postID } }): Promise<Static<typeof Reply>> => {
      const { topic, post } = await getPost(auth, postID, Type.subject);

      const creator = convert.oldToUser(await fetchUserX(post.uid));

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
            'x-examples': formatErrors(new NotAllowedError('edit reply')),
          }),
        },
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
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

      const topic = await Topic.fetchTopicDetail(auth, Type.subject, post.topicID);
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

  type ISubjectInterestComment = Static<typeof SubjectInterestComment>;
  const SubjectInterestComment = t.Object(
    {
      total: t.Integer(),
      list: t.Array(
        t.Object({
          user: t.Ref(res.User),
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
        order: { updatedAt: 'desc' },
        skip: query.offset,
        take: query.limit,
      });

      const commentPromises = comments.map(async (v) => {
        const u = await fetchUserX(v.uid);
        return {
          user: convert.oldToUser(u),
          rate: v.rate,
          comment: v.comment,
          updatedAt: v.updatedAt,
        };
      });

      return {
        total: count,
        list: await Promise.all(commentPromises),
      };
    },
  );
}
