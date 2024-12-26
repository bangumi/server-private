import type { Static } from '@sinclair/typebox';
import { Type as t } from '@sinclair/typebox';

import type { IAuth } from '@app/lib/auth/index.ts';
import { NotAllowedError } from '@app/lib/auth/index.ts';
import { Dam } from '@app/lib/dam.ts';
import { BadRequestError, CaptchaError, NotFoundError } from '@app/lib/error.ts';
import { Security, Tag } from '@app/lib/openapi/index.ts';
import type { entity } from '@app/lib/orm/index.ts';
import { fetchUserX } from '@app/lib/orm/index.ts';
import * as orm from '@app/lib/orm/index.ts';
import { turnstile } from '@app/lib/services/turnstile.ts';
import { handleTopicReply, NotJoinPrivateGroupError } from '@app/lib/topic/index.ts';
import * as Topic from '@app/lib/topic/index.ts';
import { CommentState, TopicParentType } from '@app/lib/topic/type.ts';
import * as convert from '@app/lib/types/convert.ts';
import { formatErrors } from '@app/lib/types/res.ts';
import * as res from '@app/lib/types/res.ts';
import { requireLogin } from '@app/routes/hooks/pre-handler.ts';
import type { App } from '@app/routes/type.ts';

// eslint-disable-next-line @typescript-eslint/require-await
export async function setup(app: App) {
  async function getPost(auth: IAuth, postID: number, type: TopicParentType) {
    let post: entity.GroupPost | entity.SubjectPost | null;
    switch (type) {
      case TopicParentType.Group: {
        post = await orm.GroupPostRepo.findOneBy({ id: postID });
        break;
      }
      case TopicParentType.Subject: {
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

    if ([CommentState.UserDelete, CommentState.AdminDelete].includes(post.state)) {
      throw new NotFoundError(`${type} post ${postID}`);
    }

    const topic = await Topic.fetchTopicDetail(auth, type, post.topicID);
    if (!topic) {
      throw new NotFoundError(`${type} topic ${post.topicID}`);
    }

    if (topic.contentPost.id === post.id) {
      throw new NotFoundError(`${type} post ${postID}`);
    }

    if ([CommentState.UserDelete, CommentState.AdminDelete].includes(topic.state)) {
      throw new NotFoundError(`${type} topic ${post.topicID}`);
    }

    return { post, topic };
  }

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
          200: res.Ref(res.Reply),
          404: res.Ref(res.Error, {
            'x-examples': formatErrors(new NotFoundError('post')),
          }),
        },
        security: [{ [Security.CookiesSession]: [] }],
      },
    },
    async ({ auth, params: { postID } }): Promise<res.IReply> => {
      const { post } = await getPost(auth, postID, TopicParentType.Group);

      const creator = convert.oldToUser(await fetchUserX(post.uid));

      return {
        id: postID,
        creator,
        state: post.state,
        createdAt: post.dateline,
        text: post.content,
        replies: [],
        reactions: [],
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
          401: res.Ref(res.Error, {
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

      const topic = await Topic.fetchTopicDetail(auth, TopicParentType.Group, post.topicID);
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
          401: res.Ref(res.Error, {
            'x-examples': formatErrors(new NotAllowedError('delete this post')),
          }),
          404: res.Ref(res.Error, {
            'x-examples': formatErrors(new NotFoundError('post')),
          }),
        },
        security: [{ [Security.CookiesSession]: [] }],
      },
      preHandler: [requireLogin('delete a post')],
    },
    async ({ auth, params: { postID } }) => {
      const { post } = await getPost(auth, postID, TopicParentType.Group);

      if (auth.userID !== post.uid) {
        throw new NotAllowedError('delete this post');
      }

      if (post.state !== CommentState.Normal) {
        return {};
      }

      await orm.GroupPostRepo.update({ id: postID }, { state: CommentState.UserDelete });
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
          200: res.Ref(res.SubReply),
          401: res.Ref(res.Error, {
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
    }): Promise<res.ISubReply> => {
      if (!(await turnstile.verify(cfCaptchaResponse))) {
        throw new CaptchaError();
      }
      return await handleTopicReply(auth, TopicParentType.Group, topicID, content, replyTo);
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
          200: res.Ref(res.SubReply),
          401: res.Ref(res.Error, {
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
    }): Promise<res.ISubReply> => {
      if (!(await turnstile.verify(cfCaptchaResponse))) {
        throw new CaptchaError();
      }
      return await handleTopicReply(auth, TopicParentType.Subject, topicID, content, replyTo);
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
          401: res.Ref(res.Error, {
            'x-examples': formatErrors(new NotAllowedError('delete this post')),
          }),
          404: res.Ref(res.Error, {
            'x-examples': formatErrors(new NotFoundError('post')),
          }),
        },
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
      },
      preHandler: [requireLogin('delete a post')],
    },
    async ({ auth, params: { postID } }) => {
      const { post } = await getPost(auth, postID, TopicParentType.Subject);

      if (auth.userID !== post.uid) {
        throw new NotAllowedError('delete this post');
      }

      if (post.state !== CommentState.Normal) {
        return {};
      }

      await orm.SubjectPostRepo.update({ id: postID }, { state: CommentState.UserDelete });
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
          200: res.Ref(res.Reply),
          404: res.Ref(res.Error, {
            'x-examples': formatErrors(new NotFoundError('post')),
          }),
        },
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
      },
      preHandler: [requireLogin('get a posts')],
    },
    async ({ auth, params: { postID } }): Promise<Static<typeof res.Reply>> => {
      const { post } = await getPost(auth, postID, TopicParentType.Subject);

      const creator = convert.oldToUser(await fetchUserX(post.uid));

      return {
        id: postID,
        creator,
        state: post.state,
        createdAt: post.dateline,
        text: post.content,
        replies: [],
        reactions: [],
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
          401: res.Ref(res.Error, {
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

      const topic = await Topic.fetchTopicDetail(auth, TopicParentType.Subject, post.topicID);
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
}
