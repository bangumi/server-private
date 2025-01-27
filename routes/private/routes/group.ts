import type { Static } from '@sinclair/typebox';
import { Type as t } from '@sinclair/typebox';

import type { IAuth } from '@app/lib/auth/index.ts';
import { NotAllowedError } from '@app/lib/auth/index.ts';
import { Dam, dam } from '@app/lib/dam.ts';
import { BadRequestError, NotFoundError, UnexpectedNotFoundError } from '@app/lib/error.ts';
import { groupIcon } from '@app/lib/images';
import * as Like from '@app/lib/like.ts';
import { Security, Tag } from '@app/lib/openapi/index.ts';
import type { Page } from '@app/lib/orm/index.ts';
import * as orm from '@app/lib/orm/index.ts';
import { GroupMemberRepo, isMemberInGroup } from '@app/lib/orm/index.ts';
import type { ITopic } from '@app/lib/topic/index.ts';
import * as Topic from '@app/lib/topic/index.ts';
import { NotJoinPrivateGroupError } from '@app/lib/topic/index.ts';
import { CommentState, TopicDisplay, TopicParentType } from '@app/lib/topic/type.ts';
import * as convert from '@app/lib/types/convert.ts';
import * as fetcher from '@app/lib/types/fetcher.ts';
import * as req from '@app/lib/types/req.ts';
import * as res from '@app/lib/types/res.ts';
import { formatErrors } from '@app/lib/types/res.ts';
import { fetchFriends } from '@app/lib/user/utils.ts';
import { requireLogin } from '@app/routes/hooks/pre-handler.ts';
import type { App } from '@app/routes/type.ts';

const GroupProfile = t.Object(
  {
    recentAddedMembers: t.Array(res.Ref(res.GroupMember)),
    topics: t.Array(res.Ref(res.Topic)),
    inGroup: t.Boolean({ description: '是否已经加入小组' }),
    group: t.Object({
      id: t.Integer(),
      name: t.String(),
      nsfw: t.Boolean(),
      description: t.String(),
      title: t.String(),
      createdAt: t.Number(),
      totalMembers: t.Integer(),
      icon: t.String(),
    }),
    totalTopics: t.Integer(),
  },
  { $id: 'GroupProfile' },
);

// eslint-disable-next-line @typescript-eslint/require-await
export async function setup(app: App) {
  app.addSchema(GroupProfile);

  app.get(
    '/groups/:groupName/profile',
    {
      schema: {
        description: '获取小组首页',
        operationId: 'getGroupProfile',
        tags: [Tag.Group],
        params: t.Object({
          groupName: t.String({ minLength: 1 }),
        }),
        querystring: t.Object({
          limit: t.Optional(t.Integer({ default: 20, maximum: 40 })),
          offset: t.Optional(t.Integer({ default: 0, minimum: 0 })),
        }),
        response: {
          200: res.Ref(GroupProfile),
        },
      },
    },
    async ({ params, auth, query }) => {
      const group = await orm.fetchGroup(params.groupName);

      if (!group) {
        throw new NotFoundError('group');
      }

      const [total, topicList] = await Topic.fetchTopicList(
        auth,
        TopicParentType.Group,
        group.id,
        query,
      );

      const topics = await addCreators(topicList, group.id);

      return {
        group: { ...group, icon: groupIcon(group.icon).small },
        totalTopics: total,
        inGroup: auth.login ? await orm.isMemberInGroup(group.id, auth.userID) : false,
        topics,
        recentAddedMembers: await fetchRecentMember(group.id),
      };
    },
  );

  app.get(
    '/groups/-/topics/:id',
    {
      schema: {
        description: '获取帖子列表',
        operationId: 'getGroupTopicDetail',
        tags: [Tag.Group],
        params: t.Object({
          id: t.Integer({ examples: [371602] }),
        }),
        response: {
          200: res.Ref(res.TopicDetail),
        },
      },
    },
    async ({ auth, params: { id } }) => {
      return await handleTopicDetail(auth, TopicParentType.Group, id);
    },
  );

  app.get(
    '/groups/:groupName/members',
    {
      schema: {
        description: '获取帖子列表',
        operationId: 'listGroupMembersByName',
        tags: [Tag.Group],
        params: t.Object({
          groupName: t.String({ minLength: 1 }),
        }),
        querystring: t.Object({
          type: t.Optional(
            t.Enum(
              {
                mod: 'mod',
                normal: 'normal',
                all: 'all',
              } as const,
              { default: 'all' },
            ),
          ),
          limit: t.Optional(t.Integer({ default: 30, maximum: 40 })),
          offset: t.Optional(t.Integer({ default: 0 })),
        }),
        response: {
          200: res.Paged(res.Ref(res.GroupMember)),
        },
      },
    },
    async ({ params, query: { type = 'all', limit, offset } }) => {
      const group = await orm.fetchGroup(params.groupName);

      if (!group) {
        throw new NotFoundError('group');
      }

      const [total, members] = await fetchGroupMemberList(group.id, { type, limit, offset });

      return { total, data: members };
    },
  );

  app.get(
    '/groups/:groupName/topics',
    {
      schema: {
        description: '获取帖子列表',
        operationId: 'getGroupTopicsByGroupName',
        tags: [Tag.Group],
        params: t.Object({
          groupName: t.String({ minLength: 1 }),
        }),
        querystring: t.Object({
          limit: t.Optional(t.Integer({ default: 30, maximum: 40 })),
          offset: t.Optional(t.Integer({ default: 0 })),
        }),
        response: {
          200: res.Paged(res.Ref(res.Topic)),
          404: res.Ref(res.Error, {
            description: '小组不存在',
            'x-examples': {
              NotFoundError: { value: res.formatError(new NotFoundError('topic')) },
            },
          }),
        },
      },
    },
    async ({ params, query, auth }) => {
      const group = await orm.fetchGroup(params.groupName);

      if (!group) {
        throw new NotFoundError('group');
      }

      if (!group.accessible && !(await isMemberInGroup(group.id, auth.userID))) {
        throw new NotJoinPrivateGroupError(group.name);
      }

      const [total, topics] = await Topic.fetchTopicList(
        auth,
        TopicParentType.Group,
        group.id,
        query,
      );

      return { total, data: await addCreators(topics, group.id) };
    },
  );

  app.post(
    '/groups/:groupName/topics',
    {
      schema: {
        tags: [Tag.Group],
        operationId: 'createNewGroupTopic',
        params: t.Object({
          groupName: t.String({ minLength: 1, examples: ['sandbox'] }),
        }),
        response: {
          200: t.Object({
            id: t.Integer({ description: 'new topic id' }),
          }),
        },
        security: [{ [Security.CookiesSession]: [] }],
        body: res.Ref(req.CreateTopic),
      },
      preHandler: [requireLogin('creating a post')],
    },
    async ({ auth, body: { text, title }, params: { groupName } }) => {
      if (auth.permission.ban_post) {
        throw new NotAllowedError('create posts');
      }

      const group = await orm.fetchGroup(groupName);
      if (!group) {
        throw new NotFoundError(`group ${groupName}`);
      }

      let display = TopicDisplay.Normal;

      if (dam.needReview(title) || dam.needReview(text)) {
        display = TopicDisplay.Review;
      }

      if (!group.accessible && !(await orm.isMemberInGroup(group.id, auth.userID))) {
        throw new NotAllowedError('create posts, join group first');
      }

      return await orm.createPost({
        title,
        content: text,
        display,
        userID: auth.userID,
        parentID: group.id,
        state: CommentState.Normal,
        topicType: 'group',
      });
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
          400: res.Ref(res.Error),
          401: res.Ref(res.Error, {
            'x-examples': formatErrors(new NotAllowedError('edit a topic')),
          }),
        },
        security: [{ [Security.CookiesSession]: [] }],
        body: res.Ref(req.CreateTopic),
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

      const topic = await Topic.fetchTopicDetail(auth, TopicParentType.Group, topicID);
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

async function addCreators(
  topics: ITopic[],
  parentID: number,
): Promise<Static<typeof res.Topic>[]> {
  const withCreator = await orm.addCreator(topics);

  return withCreator.map((x) => {
    return {
      ...x,
      creator: convert.oldToUser(x.creator),
      updatedAt: x.updatedAt,
      parentID,
    };
  });
}

async function fetchGroupMemberList(
  groupID: number,
  { limit = 30, offset = 0, type }: Page & { type: 'mod' | 'normal' | 'all' },
): Promise<[number, res.IGroupMember[]]> {
  const where = {
    gmbGid: groupID,
    gmbModerator: type === 'all' ? undefined : type === 'mod',
  } as const;
  const total = await GroupMemberRepo.count({ where });

  const members = await GroupMemberRepo.find({
    where,
    take: limit,
    skip: offset,
    order: {
      gmbDateline: 'desc',
    },
  });

  const users = await orm.fetchUsers(members.map((x) => x.gmbUid));

  return [
    total,
    members.map(function (x): res.IGroupMember {
      const user = users[x.gmbUid];
      if (!user) {
        throw new UnexpectedNotFoundError(`user ${x.gmbUid}`);
      }

      return {
        ...convert.oldToUser(user),
        joinedAt: x.gmbDateline,
      };
    }),
  ];
}

async function fetchRecentMember(groupID: number): Promise<res.IGroupMember[]> {
  const [_, members] = await fetchGroupMemberList(groupID, { limit: 6, type: 'all' });

  return members;
}

export async function handleTopicDetail(
  auth: IAuth,
  type: TopicParentType,
  id: number,
): Promise<Static<typeof res.TopicDetail>> {
  const topic = await Topic.fetchTopicDetail(auth, type, id);
  if (!topic) {
    throw new NotFoundError(`topic ${id}`);
  }

  let parent: res.ISlimGroup | res.ISlimSubject | undefined;
  switch (type) {
    case TopicParentType.Group: {
      parent = await fetcher.fetchSlimGroupByID(topic.parentID);
      break;
    }
    case TopicParentType.Subject: {
      parent = await fetcher.fetchSlimSubjectByID(topic.parentID);
      break;
    }
    default: {
      parent = undefined;
    }
  }
  if (!parent) {
    throw new UnexpectedNotFoundError(`parent ${topic.parentID}`);
  }

  const userIds: number[] = [
    topic.creatorID,
    ...topic.replies.flatMap((x) => [x.creatorID, ...x.replies.map((x) => x.creatorID)]),
  ];

  const friends = await fetchFriends(auth.userID);
  const users = await orm.fetchUsers([...new Set(userIds)]);

  const creator = users[topic.creatorID];
  if (!creator) {
    throw new UnexpectedNotFoundError(`user ${topic.creatorID}`);
  }

  const reactions = await Like.fetchTopicReactions(id, auth.userID);

  return {
    ...topic,
    creator: convert.oldToUser(creator),
    text: topic.text,
    parent,
    reactions: reactions[topic.contentPost.id] ?? [],
    replies: topic.replies.map((x) => {
      const user = users[x.creatorID];
      if (!user) {
        throw new UnexpectedNotFoundError(`user ${x.creatorID}`);
      }
      return {
        reactions: reactions[x.id] ?? [],
        isFriend: friends[x.creatorID] ?? false,
        ...x,
        replies: x.replies.map((x) => {
          const user = users[x.creatorID];
          if (!user) {
            throw new UnexpectedNotFoundError(`user ${x.creatorID}`);
          }
          return {
            reactions: reactions[x.id] ?? [],
            isFriend: friends[x.creatorID] ?? false,
            ...x,
            creator: convert.oldToUser(user),
          };
        }),
        creator: {
          isFriend: friends[x.creatorID] ?? false,
          ...convert.oldToUser(user),
        },
      };
    }),
    state: topic.state,
  };
}
