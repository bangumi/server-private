import { Type as t } from '@sinclair/typebox';
import { DateTime } from 'luxon';

import { db, op, schema } from '@app/drizzle';
import { NotAllowedError } from '@app/lib/auth/index.ts';
import { Dam, dam } from '@app/lib/dam.ts';
import {
  BadRequestError,
  NotFoundError,
  NotJoinPrivateGroupError,
  UnexpectedNotFoundError,
} from '@app/lib/error.ts';
import {
  GroupFilterMode,
  GroupMemberRole,
  GroupSort,
  GroupTopicFilterMode,
} from '@app/lib/group/type';
import { getGroupMember, isMemberInGroup } from '@app/lib/group/utils.ts';
import { LikeType, Reaction } from '@app/lib/like';
import { Notify, NotifyType } from '@app/lib/notify.ts';
import { Security, Tag } from '@app/lib/openapi/index.ts';
import { CanViewTopicContent, CanViewTopicReply } from '@app/lib/topic/display';
import { canEditTopic, canReplyPost } from '@app/lib/topic/state.ts';
import { CommentState, TopicDisplay } from '@app/lib/topic/type.ts';
import * as convert from '@app/lib/types/convert.ts';
import * as fetcher from '@app/lib/types/fetcher.ts';
import * as req from '@app/lib/types/req.ts';
import * as res from '@app/lib/types/res.ts';
import { fetchJoinedGroups } from '@app/lib/user/utils';
import { LimitAction } from '@app/lib/utils/rate-limit';
import { requireLogin, requireTurnstileToken } from '@app/routes/hooks/pre-handler.ts';
import { rateLimit } from '@app/routes/hooks/rate-limit';
import type { App } from '@app/routes/type.ts';

// eslint-disable-next-line @typescript-eslint/require-await
export async function setup(app: App) {
  app.get(
    '/groups',
    {
      schema: {
        operationId: 'getGroups',
        summary: '获取小组列表',
        tags: [Tag.Group],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        querystring: t.Object({
          mode: t.Optional(req.Ref(req.GroupFilterMode)),
          sort: req.Ref(req.GroupSort),
          limit: t.Optional(t.Integer({ default: 20, maximum: 100 })),
          offset: t.Optional(t.Integer({ default: 0 })),
        }),
        response: {
          200: res.Paged(res.Ref(res.SlimGroup)),
        },
      },
    },
    async ({
      auth,
      query: { mode = GroupFilterMode.All, sort = GroupSort.Created, limit = 20, offset = 0 },
    }) => {
      const conditions = [];
      if (!auth.allowNsfw) {
        conditions.push(op.eq(schema.chiiGroups.nsfw, false));
      }
      const orderBy = [];
      switch (sort) {
        case GroupSort.Members: {
          orderBy.push(op.desc(schema.chiiGroups.members));
          break;
        }
        case GroupSort.Posts: {
          orderBy.push(op.desc(schema.chiiGroups.posts));
          break;
        }
        case GroupSort.Topics: {
          orderBy.push(op.desc(schema.chiiGroups.topics));
          break;
        }
        case GroupSort.Created: {
          orderBy.push(op.desc(schema.chiiGroups.createdAt));
          break;
        }
        case GroupSort.Updated: {
          orderBy.push(op.desc(schema.chiiGroups.updatedAt));
          break;
        }
      }
      if (auth.login) {
        switch (mode) {
          case GroupFilterMode.Joined:
          case GroupFilterMode.Managed: {
            const roles = [GroupMemberRole.Moderator, GroupMemberRole.Creator];
            if (mode === GroupFilterMode.Joined) {
              roles.push(GroupMemberRole.Member);
            }
            conditions.push(
              op.eq(schema.chiiGroupMembers.uid, auth.userID),
              op.inArray(schema.chiiGroupMembers.role, roles),
            );
            const [{ count = 0 } = {}] = await db
              .select({ count: op.count() })
              .from(schema.chiiGroups)
              .innerJoin(
                schema.chiiGroupMembers,
                op.eq(schema.chiiGroups.id, schema.chiiGroupMembers.gid),
              )
              .where(op.and(...conditions));
            const data = await db
              .select()
              .from(schema.chiiGroups)
              .innerJoin(
                schema.chiiGroupMembers,
                op.eq(schema.chiiGroups.id, schema.chiiGroupMembers.gid),
              )
              .where(op.and(...conditions))
              .orderBy(...orderBy)
              .limit(limit)
              .offset(offset);
            const groups = data.map((d) => convert.toSlimGroup(d.chii_groups));
            return { total: count, data: groups };
          }
          case GroupFilterMode.All: {
            break;
          }
        }
      }
      const [{ count = 0 } = {}] = await db
        .select({ count: op.count() })
        .from(schema.chiiGroups)
        .where(op.and(...conditions));
      const data = await db
        .select()
        .from(schema.chiiGroups)
        .where(op.and(...conditions))
        .orderBy(...orderBy)
        .limit(limit)
        .offset(offset);
      const groups = data.map((d) => convert.toSlimGroup(d));
      return { total: count, data: groups };
    },
  );

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
      const group = convert.toGroup(data.chii_groups, data.chii_members);
      if (auth.login) {
        const member = await getGroupMember(auth.userID, group.id);
        if (member) {
          group.membership = member;
        }
      }
      return group;
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
          role: t.Optional(req.Ref(req.GroupMemberRole)),
          limit: t.Optional(t.Integer({ default: 20, maximum: 100 })),
          offset: t.Optional(t.Integer({ default: 0 })),
        }),
        response: {
          200: res.Paged(res.Ref(res.GroupMember)),
        },
      },
    },
    async ({ auth, params: { groupName }, query: { role, limit = 20, offset = 0 } }) => {
      const group = await fetcher.fetchSlimGroupByName(groupName, auth.allowNsfw);
      if (!group) {
        throw new NotFoundError('group');
      }

      const conditions = [op.eq(schema.chiiGroupMembers.gid, group.id)];
      if (role !== undefined) {
        conditions.push(op.eq(schema.chiiGroupMembers.role, role));
      }

      const [{ count = 0 } = {}] = await db
        .select({ count: op.count() })
        .from(schema.chiiGroupMembers)
        .where(op.and(...conditions));

      const data = await db
        .select()
        .from(schema.chiiGroupMembers)
        .where(op.and(...conditions))
        .orderBy(op.desc(schema.chiiGroupMembers.createdAt))
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
        summary: '获取小组话题列表',
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
        .orderBy(op.desc(schema.chiiGroupTopics.updatedAt))
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

  app.get(
    '/groups/-/topics',
    {
      schema: {
        operationId: 'getRecentGroupTopics',
        summary: '获取最新的小组话题',
        tags: [Tag.Group],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        querystring: t.Object({
          mode: req.Ref(req.GroupTopicFilterMode, {
            description: '登录时默认为 joined, 未登录或没有加入小组时始终为 all',
          }),
          limit: t.Optional(t.Integer({ default: 20, maximum: 100 })),
          offset: t.Optional(t.Integer({ default: 0 })),
        }),
        response: {
          200: res.Paged(res.Ref(res.GroupTopic)),
        },
      },
    },
    async ({ auth, query: { mode = GroupTopicFilterMode.Joined, limit = 20, offset = 0 } }) => {
      let total = 0;
      const tids = [];
      if (!auth.login) {
        mode = GroupTopicFilterMode.All;
      }
      switch (mode) {
        case GroupTopicFilterMode.All: {
          const conditions = [op.eq(schema.chiiGroupTopics.display, TopicDisplay.Normal)];
          const [{ count = 0 } = {}] = await db
            .select({ count: op.count() })
            .from(schema.chiiGroupTopics)
            .where(op.and(...conditions));
          total = count;
          const data = await db
            .select()
            .from(schema.chiiGroupTopics)
            .where(op.and(...conditions))
            .orderBy(op.desc(schema.chiiGroupTopics.updatedAt))
            .limit(limit)
            .offset(offset);
          tids.push(...data.map((x) => x.id));
          break;
        }
        case GroupTopicFilterMode.Joined: {
          const conditions = [op.eq(schema.chiiGroupTopics.display, TopicDisplay.Normal)];
          const gids = await fetchJoinedGroups(auth.userID);
          if (gids.length > 0) {
            conditions.push(op.inArray(schema.chiiGroupTopics.gid, gids));
          }
          const [{ count = 0 } = {}] = await db
            .select({ count: op.count() })
            .from(schema.chiiGroupTopics)
            .where(op.and(...conditions));
          total = count;
          const data = await db
            .select({ id: schema.chiiGroupTopics.id })
            .from(schema.chiiGroupTopics)
            .where(op.and(...conditions))
            .orderBy(op.desc(schema.chiiGroupTopics.updatedAt))
            .limit(limit)
            .offset(offset);
          tids.push(...data.map((x) => x.id));
          break;
        }
        case GroupTopicFilterMode.Created: {
          const conditions = [op.eq(schema.chiiGroupTopics.uid, auth.userID)];
          const [{ count = 0 } = {}] = await db
            .select({ count: op.count() })
            .from(schema.chiiGroupTopics)
            .where(op.and(...conditions));
          total = count;
          const data = await db
            .select({ id: schema.chiiGroupTopics.id })
            .from(schema.chiiGroupTopics)
            .where(op.and(...conditions))
            .orderBy(op.desc(schema.chiiGroupTopics.updatedAt))
            .limit(limit)
            .offset(offset);
          tids.push(...data.map((x) => x.id));
          break;
        }
        case GroupTopicFilterMode.Replied: {
          const conditions = [op.eq(schema.chiiGroupPosts.uid, auth.userID)];
          const [{ count = 0 } = {}] = await db
            .select({ count: op.countDistinct(schema.chiiGroupPosts.mid) })
            .from(schema.chiiGroupPosts)
            .where(op.and(...conditions));
          total = count;
          const data = await db
            .select({ mid: schema.chiiGroupPosts.mid })
            .from(schema.chiiGroupPosts)
            .where(op.and(...conditions))
            .groupBy(schema.chiiGroupPosts.mid)
            .orderBy(op.desc(schema.chiiGroupPosts.createdAt))
            .limit(limit)
            .offset(offset);
          tids.push(...data.map((x) => x.mid));
          break;
        }
      }
      if (tids.length === 0) {
        return { total: 0, data: [] };
      }
      const topics = await fetcher.fetchGroupTopicsByIDs(tids);
      const uids = Object.values(topics).map((d) => d.creatorID);
      const users = await fetcher.fetchSlimUsersByIDs(uids);
      const gids = Object.values(topics).map((d) => d.parentID);
      const groups = await fetcher.fetchSlimGroupsByIDs(gids, auth.allowNsfw);
      const data: res.IGroupTopic[] = [];
      for (const tid of tids) {
        const topic = topics[tid];
        if (!topic) {
          continue;
        }
        const creator = users[topic.creatorID];
        if (!creator) {
          continue;
        }
        const group = groups[topic.parentID];
        if (!group) {
          continue;
        }
        data.push({
          ...topic,
          creator,
          group,
          replies: [],
        });
      }
      return { total, data };
    },
  );

  app.post(
    '/groups/:groupName/topics',
    {
      schema: {
        operationId: 'createGroupTopic',
        summary: '创建小组话题',
        tags: [Tag.Group],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          groupName: t.String({ minLength: 1 }),
        }),
        body: t.Intersect([req.Ref(req.CreateTopic), req.Ref(req.TurnstileToken)]),
        response: {
          200: t.Object({
            id: t.Integer({ description: 'new topic id' }),
          }),
          429: res.Ref(res.Error),
        },
      },
      preHandler: [requireLogin('creating a topic'), requireTurnstileToken()],
    },
    async ({ auth, body: { title, content }, params: { groupName } }) => {
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
        summary: '获取小组话题详情',
        tags: [Tag.Topic],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          topicID: t.Integer(),
        }),
        response: {
          200: res.Ref(res.GroupTopic),
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
      const group = await fetcher.fetchSlimGroupByID(topic.gid, auth.allowNsfw);
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
        .where(op.eq(schema.chiiGroupPosts.mid, topicID))
        .orderBy(op.asc(schema.chiiGroupPosts.id));
      const uids = replies.map((x) => x.uid);
      const users = await fetcher.fetchSlimUsersByIDs(uids);
      const subReplies: Record<number, res.IReplyBase[]> = {};
      const reactions = await Reaction.fetchByMainID(topicID, LikeType.GroupReply);
      for (const x of replies.filter((x) => x.related !== 0)) {
        if (!CanViewTopicReply(x.state)) {
          x.content = '';
        }
        const sub = convert.toGroupTopicReply(x);
        sub.creator = users[sub.creatorID];
        sub.reactions = reactions[x.id] ?? [];
        const subR = subReplies[x.related] ?? [];
        subR.push(sub);
        subReplies[x.related] = subR;
      }
      const topLevelReplies: res.IReply[] = [];
      for (const x of replies.filter((x) => x.related === 0)) {
        if (!CanViewTopicReply(x.state)) {
          x.content = '';
        }
        const reply = {
          ...convert.toGroupTopicReply(x),
          creator: users[x.uid],
          replies: subReplies[x.id] ?? [],
          reactions: reactions[x.id] ?? [],
        };
        topLevelReplies.push(reply);
      }

      return {
        ...convert.toGroupTopic(topic),
        group,
        creator,
        replies: topLevelReplies,
      };
    },
  );

  app.put(
    '/groups/-/topics/:topicID',
    {
      schema: {
        operationId: 'editGroupTopic',
        description: '编辑小组话题',
        tags: [Tag.Topic],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          topicID: t.Integer(),
        }),
        body: req.Ref(req.UpdateTopic),
        response: {
          200: t.Object({}),
        },
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
        .where(
          op.and(
            op.eq(schema.chiiGroupPosts.mid, topicID),
            op.eq(schema.chiiGroupPosts.related, 0),
          ),
        )
        .orderBy(op.asc(schema.chiiGroupPosts.id))
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
      if (post.uid !== auth.userID) {
        throw new NotAllowedError('edit this topic content');
      }

      let display = topic.display;
      if (dam.needReview(title) || dam.needReview(content)) {
        if (display === TopicDisplay.Normal) {
          display = TopicDisplay.Review;
        } else {
          throw new BadRequestError('topic is already in review');
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

  app.get(
    '/groups/-/posts/:postID',
    {
      schema: {
        operationId: 'getGroupPost',
        summary: '获取小组话题回复详情',
        tags: [Tag.Topic],
        params: t.Object({
          postID: t.Integer(),
        }),
        response: {
          200: res.Ref(res.Post),
        },
      },
    },
    async ({ params: { postID } }) => {
      const [post] = await db
        .select()
        .from(schema.chiiGroupPosts)
        .where(op.eq(schema.chiiGroupPosts.id, postID))
        .limit(1);
      if (!post) {
        throw new NotFoundError(`post ${postID}`);
      }
      const creator = await fetcher.fetchSlimUserByID(post.uid);
      if (!creator) {
        throw new UnexpectedNotFoundError(`user ${post.uid}`);
      }
      const [topic] = await db
        .select()
        .from(schema.chiiGroupTopics)
        .where(op.eq(schema.chiiGroupTopics.id, post.mid))
        .limit(1);
      if (!topic) {
        throw new UnexpectedNotFoundError(`topic ${post.mid}`);
      }
      const topicCreator = await fetcher.fetchSlimUserByID(topic.uid);
      if (!topicCreator) {
        throw new UnexpectedNotFoundError(`user ${topic.uid}`);
      }
      return {
        id: post.id,
        creatorID: post.uid,
        creator,
        createdAt: post.createdAt,
        content: post.content,
        state: post.state,
        topic: {
          ...convert.toGroupTopic(topic),
          creator: topicCreator,
          replies: topic.replies,
        },
      };
    },
  );

  app.put(
    '/groups/-/posts/:postID/like',
    {
      schema: {
        summary: '给小组话题回复点赞',
        operationId: 'likeGroupPost',
        tags: [Tag.Topic],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          postID: t.Integer(),
        }),
        body: t.Object({
          value: t.Integer(),
        }),
        response: {
          200: t.Object({}),
          429: res.Ref(res.Error),
        },
      },
      preHandler: [requireLogin('liking a group post')],
    },
    async ({ auth, params: { postID }, body: { value } }) => {
      const [post] = await db
        .select({ mid: schema.chiiGroupPosts.mid })
        .from(schema.chiiGroupPosts)
        .where(op.eq(schema.chiiGroupPosts.id, postID))
        .limit(1);
      if (!post) {
        throw new NotFoundError(`post ${postID}`);
      }
      await Reaction.add({
        type: LikeType.GroupReply,
        mid: post.mid,
        rid: postID,
        uid: auth.userID,
        value,
      });
      return {};
    },
  );

  app.delete(
    '/groups/-/posts/:postID/like',
    {
      schema: {
        summary: '取消小组话题回复点赞',
        operationId: 'unlikeGroupPost',
        tags: [Tag.Topic],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          postID: t.Integer(),
        }),
        response: {
          200: t.Object({}),
        },
      },
      preHandler: [requireLogin('liking a group post')],
    },
    async ({ auth, params: { postID } }) => {
      await Reaction.delete({
        type: LikeType.GroupReply,
        rid: postID,
        uid: auth.userID,
      });
      return {};
    },
  );

  app.put(
    '/groups/-/posts/:postID',
    {
      schema: {
        operationId: 'editGroupPost',
        summary: '编辑小组话题回复',
        tags: [Tag.Topic],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          postID: t.Integer(),
        }),
        body: req.Ref(req.UpdateContent),
        response: {
          200: t.Object({}),
        },
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
        summary: '删除小组话题回复',
        tags: [Tag.Topic],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          postID: t.Integer(),
        }),
        response: {
          200: t.Object({}),
        },
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
        summary: '创建小组话题回复',
        tags: [Tag.Topic],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        params: t.Object({
          topicID: t.Integer(),
        }),
        body: t.Intersect([req.Ref(req.CreateReply), req.Ref(req.TurnstileToken)]),
        response: {
          200: t.Object({ id: t.Integer() }),
          429: res.Ref(res.Error),
        },
      },
      preHandler: [requireLogin('creating a reply'), requireTurnstileToken()],
    },
    async ({ auth, params: { topicID }, body: { content, replyTo = 0 } }) => {
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
        if (!canReplyPost(parent.state)) {
          throw new NotAllowedError('reply to a admin action post');
        }
        notifyUserID = parent.uid;
      }

      await rateLimit(LimitAction.Group, auth.userID);

      const createdAt = DateTime.now().toUnixInteger();

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
          createdAt,
        });
        postID = insertId;
        const topicUpdate: Record<string, number> = {
          replies: count,
        };
        if (topic.state !== CommentState.AdminSilentTopic) {
          topicUpdate.updatedAt = createdAt;
        }
        await t
          .update(schema.chiiGroupTopics)
          .set(topicUpdate)
          .where(op.eq(schema.chiiGroupTopics.id, topicID));
        await Notify.create(t, {
          destUserID: notifyUserID,
          sourceUserID: auth.userID,
          createdAt,
          type: replyTo === 0 ? NotifyType.GroupTopicReply : NotifyType.GroupPostReply,
          relatedID: postID,
          mainID: topic.id,
          title: topic.title,
        });
      });

      return { id: postID };
    },
  );
}
