import { Type as t } from '@sinclair/typebox';
import { DateTime } from 'luxon';

import { db, op } from '@app/drizzle/db.ts';
import * as schema from '@app/drizzle/schema';
import { NotAllowedError } from '@app/lib/auth/index.ts';
import { Dam, dam } from '@app/lib/dam.ts';
import {
  BadRequestError,
  CaptchaError,
  NotFoundError,
  NotJoinPrivateGroupError,
  UnexpectedNotFoundError,
} from '@app/lib/error.ts';
import { isMemberInGroup } from '@app/lib/group/utils.ts';
import * as Notify from '@app/lib/notify.ts';
import { Security, Tag } from '@app/lib/openapi/index.ts';
import { turnstile } from '@app/lib/services/turnstile';
import { CanViewTopicContent, CanViewTopicReply } from '@app/lib/topic/display';
import { canEditTopic, postCanReply } from '@app/lib/topic/state.ts';
import { CommentState, TopicDisplay } from '@app/lib/topic/type.ts';
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
    '/groups/:groupName',
    {
      schema: {
        operationId: 'getGroup',
        summary: '获取小组详情',
        tags: [Tag.Group],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          groupName: t.String({ minLength: 1 }),
        }),
        response: {
          200: res.Ref(res.Group),
        },
      },
    },
    async ({ auth, params: { groupName } }) => {
      const [data] = await db
        .select()
        .from(schema.chiiGroups)
        .innerJoin(schema.chiiUsers, op.eq(schema.chiiGroups.creator, schema.chiiUsers.id))
        .where(
          op.and(
            op.eq(schema.chiiGroups.name, groupName),
            auth.allowNsfw ? undefined : op.eq(schema.chiiGroups.nsfw, false),
          ),
        );
      if (!data) {
        throw new NotFoundError(`group ${groupName}`);
      }
      return convert.toGroup(data.chii_groups, data.chii_members);
    },
  );

  app.get(
    '/groups/:groupName/members',
    {
      schema: {
        operationId: 'getGroupMembers',
        summary: '获取小组成员列表',
        tags: [Tag.Group],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          groupName: t.String({ minLength: 1 }),
        }),
        querystring: t.Object({
          moderator: t.Optional(t.Boolean({ default: false })),
          limit: t.Optional(t.Integer({ default: 20, maximum: 100 })),
          offset: t.Optional(t.Integer({ default: 0 })),
        }),
        response: {
          200: res.Paged(res.Ref(res.GroupMember)),
        },
      },
    },
    async ({ auth, params: { groupName }, query: { moderator, limit = 20, offset = 0 } }) => {
      const group = await fetcher.fetchSlimGroupByName(groupName, auth.allowNsfw);
      if (!group) {
        throw new NotFoundError('group');
      }

      const conditions = [op.eq(schema.chiiGroupMembers.gid, group.id)];
      if (moderator) {
        conditions.push(op.eq(schema.chiiGroupMembers.moderator, moderator));
      }

      const [{ count = 0 } = {}] = await db
        .select({ count: op.count() })
        .from(schema.chiiGroupMembers)
        .where(op.and(...conditions));

      const data = await db
        .select()
        .from(schema.chiiGroupMembers)
        .where(op.and(...conditions))
        .limit(limit)
        .offset(offset);
      const members = data.map((d) => convert.toGroupMember(d));

      const uids = data.map((x) => x.uid);
      const users = await fetcher.fetchSlimUsersByIDs(uids);

      for (const member of members) {
        member.user = users[member.uid];
      }

      return { total: count, data: members };
    },
  );

  app.get(
    '/groups/:groupName/topics',
    {
      schema: {
        operationId: 'getGroupTopics',
        summary: '获取小组帖子列表',
        tags: [Tag.Group],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          groupName: t.String({ minLength: 1 }),
        }),
        querystring: t.Object({
          limit: t.Optional(t.Integer({ default: 20, maximum: 100 })),
          offset: t.Optional(t.Integer({ default: 0 })),
        }),
        response: {
          200: res.Paged(res.Ref(res.Topic)),
        },
      },
    },
    async ({ auth, params: { groupName }, query: { limit = 20, offset = 0 } }) => {
      const group = await fetcher.fetchSlimGroupByName(groupName, auth.allowNsfw);
      if (!group) {
        throw new NotFoundError('group');
      }

      if (!group.accessible && !(await isMemberInGroup(group.id, auth.userID))) {
        throw new NotJoinPrivateGroupError(group.name);
      }

      const conditions = [op.eq(schema.chiiGroupTopics.gid, group.id)];
      if (!auth.permission.manage_topic_state) {
        conditions.push(op.eq(schema.chiiGroupTopics.display, TopicDisplay.Normal));
      }

      const [{ count = 0 } = {}] = await db
        .select({ count: op.count() })
        .from(schema.chiiGroupTopics)
        .where(op.and(...conditions));

      const data = await db
        .select()
        .from(schema.chiiGroupTopics)
        .where(op.and(...conditions))
        .limit(limit)
        .offset(offset);

      const topics = data.map((d) => convert.toGroupTopic(d));
      const uids = topics.map((t) => t.creatorID);
      const users = await fetcher.fetchSlimUsersByIDs(uids);
      for (const topic of topics) {
        topic.creator = users[topic.creatorID];
      }
      return { total: count, data: topics };
    },
  );

  app.post(
    '/groups/:groupName/topics',
    {
      schema: {
        operationId: 'createGroupTopic',
        summary: '创建小组帖子',
        tags: [Tag.Group],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          groupName: t.String({ minLength: 1 }),
        }),
        response: {
          200: t.Object({
            id: t.Integer({ description: 'new topic id' }),
          }),
        },
        body: res.Ref(req.CreateTopic),
      },
      preHandler: [requireLogin('creating a topic')],
    },
    async ({
      auth,
      body: { title, content, 'cf-turnstile-response': cfCaptchaResponse },
      params: { groupName },
    }) => {
      if (!(await turnstile.verify(cfCaptchaResponse ?? ''))) {
        throw new CaptchaError();
      }
      if (auth.permission.ban_post) {
        throw new NotAllowedError('create topic');
      }
      if (!Dam.allCharacterPrintable(title)) {
        throw new BadRequestError('title contains invalid invisible character');
      }
      if (!Dam.allCharacterPrintable(content)) {
        throw new BadRequestError('content contains invalid invisible character');
      }

      const group = await fetcher.fetchSlimGroupByName(groupName, auth.allowNsfw);
      if (!group) {
        throw new NotFoundError(`group ${groupName}`);
      }
      if (!group.accessible && !(await isMemberInGroup(group.id, auth.userID))) {
        throw new NotAllowedError('create posts, join group first');
      }

      const state = CommentState.Normal;
      let display = TopicDisplay.Normal;
      if (dam.needReview(title) || dam.needReview(content)) {
        display = TopicDisplay.Review;
      }

      await rateLimit(LimitAction.Group, auth.userID);
      const now = DateTime.now().toUnixInteger();

      let topicID = 0;
      await db.transaction(async (t) => {
        const [{ insertId }] = await t.insert(schema.chiiGroupTopics).values({
          gid: group.id,
          uid: auth.userID,
          title,
          replies: 0,
          state,
          display,
          createdAt: now,
          updatedAt: now,
        });
        await t.insert(schema.chiiGroupPosts).values({
          mid: insertId,
          uid: auth.userID,
          related: 0,
          content,
          state,
          createdAt: now,
        });
        topicID = insertId;
      });

      return { id: topicID };
    },
  );

  app.get(
    '/groups/-/topics/:topicID',
    {
      schema: {
        operationId: 'getGroupTopic',
        summary: '获取小组帖子详情',
        tags: [Tag.Group],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          topicID: t.Integer(),
        }),
        response: {
          200: res.Ref(res.TopicDetail),
        },
      },
    },
    async ({ auth, params: { topicID } }) => {
      const [topic] = await db
        .select()
        .from(schema.chiiGroupTopics)
        .where(op.eq(schema.chiiGroupTopics.id, topicID));
      if (!topic) {
        throw new NotFoundError(`topic ${topicID}`);
      }
      if (!CanViewTopicContent(auth, topic.state, topic.display, topic.uid)) {
        throw new NotFoundError(`topic ${topicID}`);
      }
      const group = await fetcher.fetchSlimGroupByID(topic.gid);
      if (!group) {
        throw new UnexpectedNotFoundError(`group ${topic.gid}`);
      }
      const creator = await fetcher.fetchSlimUserByID(topic.uid);
      if (!creator) {
        throw new UnexpectedNotFoundError(`user ${topic.uid}`);
      }
      const replies = await db
        .select()
        .from(schema.chiiGroupPosts)
        .where(op.eq(schema.chiiGroupPosts.mid, topicID));
      const top = replies.shift();
      if (!top || top.related !== 0) {
        throw new UnexpectedNotFoundError(`top reply of topic ${topicID}`);
      }
      const uids = replies.map((x) => x.uid);
      const users = await fetcher.fetchSlimUsersByIDs(uids);
      const subReplies: Record<number, res.ISubReply[]> = {};
      for (const x of replies.filter((x) => x.related !== 0)) {
        if (!CanViewTopicReply(x.state)) {
          x.content = '';
        }
        const sub = convert.toGroupTopicSubReply(x);
        sub.creator = users[sub.creatorID];
        const subR = subReplies[x.related] ?? [];
        subR.push(sub);
        subReplies[x.related] = subR;
      }
      const topLevelReplies = [];
      for (const x of replies.filter((x) => x.related === 0)) {
        if (!CanViewTopicReply(x.state)) {
          x.content = '';
        }
        const reply = convert.toGroupTopicReply(x);
        reply.replies = subReplies[reply.id] ?? [];
        topLevelReplies.push(reply);
      }

      return {
        id: topic.id,
        parent: group,
        creator,
        title: topic.title,
        content: top.content,
        state: topic.state,
        createdAt: topic.createdAt,
        replies: topLevelReplies,
        reactions: [],
        display: topic.display,
      };
    },
  );

  app.put(
    '/groups/-/topics/:topicID',
    {
      schema: {
        operationId: 'editGroupTopic',
        description: '编辑小组帖子',
        tags: [Tag.Group],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          topicID: t.Integer(),
        }),
        body: req.Ref(req.UpdateTopic),
      },
      preHandler: [requireLogin('edit a topic')],
    },
    async ({ auth, body: { title, content }, params: { topicID } }) => {
      if (auth.permission.ban_post) {
        throw new NotAllowedError('edit topic');
      }
      if (!(Dam.allCharacterPrintable(title) && Dam.allCharacterPrintable(content))) {
        throw new BadRequestError('content contains invalid invisible character');
      }

      const [topic] = await db
        .select()
        .from(schema.chiiGroupTopics)
        .where(op.eq(schema.chiiGroupTopics.id, topicID));
      if (!topic) {
        throw new NotFoundError(`topic ${topicID}`);
      }
      const [post] = await db
        .select()
        .from(schema.chiiGroupPosts)
        .where(op.eq(schema.chiiGroupPosts.mid, topicID))
        .limit(1);
      if (!post) {
        throw new UnexpectedNotFoundError(`top post of topic ${topicID}`);
      }

      if (!canEditTopic(topic.state)) {
        throw new NotAllowedError('edit this topic');
      }
      if (topic.uid !== auth.userID) {
        throw new NotAllowedError('edit this topic');
      }

      let display = topic.display;
      if (dam.needReview(title) || dam.needReview(content)) {
        if (display === TopicDisplay.Normal) {
          display = TopicDisplay.Review;
        } else {
          return {};
        }
      }

      await db.transaction(async (t) => {
        await t
          .update(schema.chiiGroupTopics)
          .set({ title, display })
          .where(op.eq(schema.chiiGroupTopics.id, topic.id));
        await t
          .update(schema.chiiGroupPosts)
          .set({ content })
          .where(op.eq(schema.chiiGroupPosts.id, post.id));
      });

      return {};
    },
  );

  app.put(
    '/groups/-/posts/:postID',
    {
      schema: {
        operationId: 'editGroupPost',
        summary: '编辑小组帖子回复',
        tags: [Tag.Group],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          postID: t.Integer(),
        }),
        body: req.Ref(req.UpdatePost),
      },
      preHandler: [requireLogin('edit a post')],
    },
    async ({ auth, body: { content }, params: { postID } }) => {
      if (auth.permission.ban_post) {
        throw new NotAllowedError('edit reply');
      }
      if (!Dam.allCharacterPrintable(content)) {
        throw new BadRequestError('content contains invalid invisible character');
      }

      const [post] = await db
        .select()
        .from(schema.chiiGroupPosts)
        .where(op.eq(schema.chiiGroupPosts.id, postID))
        .limit(1);
      if (!post) {
        throw new NotFoundError(`post ${postID}`);
      }

      if (post.uid !== auth.userID) {
        throw new NotAllowedError('edit reply not created by you');
      }

      const [topic] = await db
        .select()
        .from(schema.chiiGroupTopics)
        .where(op.eq(schema.chiiGroupTopics.id, post.mid))
        .limit(1);
      if (!topic) {
        throw new UnexpectedNotFoundError(`topic ${post.mid}`);
      }
      if (topic.state === CommentState.AdminCloseTopic) {
        throw new NotAllowedError('edit reply in a closed topic');
      }
      if ([CommentState.AdminDelete, CommentState.UserDelete].includes(post.state)) {
        throw new NotAllowedError('edit a deleted reply');
      }

      const [reply] = await db
        .select()
        .from(schema.chiiGroupPosts)
        .where(
          op.and(
            op.eq(schema.chiiGroupPosts.mid, topic.id),
            op.eq(schema.chiiGroupPosts.related, postID),
          ),
        )
        .limit(1);
      if (reply) {
        throw new NotAllowedError('edit a post with reply');
      }

      await db
        .update(schema.chiiGroupPosts)
        .set({ content })
        .where(op.eq(schema.chiiGroupPosts.id, postID));

      return {};
    },
  );

  app.delete(
    '/groups/-/posts/:postID',
    {
      schema: {
        operationId: 'deleteGroupPost',
        summary: '删除小组帖子回复',
        tags: [Tag.Group],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          postID: t.Integer(),
        }),
      },
      preHandler: [requireLogin('delete a post')],
    },
    async ({ auth, params: { postID } }) => {
      const [post] = await db
        .select()
        .from(schema.chiiGroupPosts)
        .where(op.eq(schema.chiiGroupPosts.id, postID))
        .limit(1);
      if (!post) {
        throw new NotFoundError(`post ${postID}`);
      }

      if (post.uid !== auth.userID) {
        throw new NotAllowedError('delete reply not created by you');
      }

      await db
        .update(schema.chiiGroupPosts)
        .set({ state: CommentState.UserDelete })
        .where(op.eq(schema.chiiGroupPosts.id, postID));

      return {};
    },
  );

  app.post(
    '/groups/-/topics/:topicID/replies',
    {
      schema: {
        operationId: 'createGroupReply',
        summary: '创建小组帖子回复',
        tags: [Tag.Group],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          topicID: t.Integer(),
        }),
        body: req.Ref(req.CreatePost),
        response: {
          200: t.Object({ id: t.Integer() }),
        },
      },
      preHandler: [requireLogin('creating a reply')],
    },
    async ({
      auth,
      params: { topicID },
      body: { 'cf-turnstile-response': cfCaptchaResponse, content, replyTo = 0 },
    }) => {
      if (!(await turnstile.verify(cfCaptchaResponse))) {
        throw new CaptchaError();
      }
      if (auth.permission.ban_post) {
        throw new NotAllowedError('create reply');
      }
      if (!Dam.allCharacterPrintable(content)) {
        throw new BadRequestError('content contains invalid invisible character');
      }
      const [topic] = await db
        .select()
        .from(schema.chiiGroupTopics)
        .where(op.eq(schema.chiiGroupTopics.id, topicID))
        .limit(1);
      if (!topic) {
        throw new NotFoundError(`topic ${topicID}`);
      }
      if (topic.state === CommentState.AdminCloseTopic) {
        throw new NotAllowedError('reply to a closed topic');
      }

      const [group] = await db
        .select()
        .from(schema.chiiGroups)
        .where(op.eq(schema.chiiGroups.id, topic.gid))
        .limit(1);
      if (!group) {
        throw new UnexpectedNotFoundError(`group ${topic.gid}`);
      }
      if (!group.accessible && !(await isMemberInGroup(group.id, auth.userID))) {
        throw new NotJoinPrivateGroupError(group.name);
      }

      let notifyUserID = topic.uid;
      if (replyTo) {
        const [parent] = await db
          .select()
          .from(schema.chiiGroupPosts)
          .where(op.eq(schema.chiiGroupPosts.id, replyTo))
          .limit(1);
        if (!parent) {
          throw new NotFoundError(`post ${replyTo}`);
        }
        if (!postCanReply(parent.state)) {
          throw new NotAllowedError('reply to a admin action post');
        }
        notifyUserID = parent.uid;
      }

      await rateLimit(LimitAction.Group, auth.userID);

      const now = DateTime.now();

      let postID = 0;
      await db.transaction(async (t) => {
        const [{ count = 0 } = {}] = await t
          .select({ count: op.count() })
          .from(schema.chiiGroupPosts)
          .where(
            op.and(
              op.eq(schema.chiiGroupPosts.mid, topicID),
              op.eq(schema.chiiGroupPosts.state, CommentState.Normal),
            ),
          );
        const [{ insertId }] = await t.insert(schema.chiiGroupPosts).values({
          mid: topicID,
          uid: auth.userID,
          related: replyTo,
          content,
          state: CommentState.Normal,
          createdAt: now.toUnixInteger(),
        });
        postID = insertId;
        const topicUpdate: Record<string, number> = {
          replies: count,
        };
        if (topic.state !== CommentState.AdminSilentTopic) {
          topicUpdate.updatedAt = now.toUnixInteger();
        }
        await t
          .update(schema.chiiGroupTopics)
          .set(topicUpdate)
          .where(op.eq(schema.chiiGroupTopics.id, topicID));
      });

      await Notify.create({
        destUserID: notifyUserID,
        sourceUserID: auth.userID,
        now,
        type: replyTo === 0 ? Notify.Type.GroupTopicReply : Notify.Type.GroupPostReply,
        postID,
        topicID: topic.id,
        title: topic.title,
      });

      return { id: postID };
    },
  );
}
