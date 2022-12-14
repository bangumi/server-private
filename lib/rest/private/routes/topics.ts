import type { Static } from '@sinclair/typebox';
import { Type as t } from '@sinclair/typebox';

import { NotAllowedError } from '../../../auth';
import { rule, TopicDisplay } from '../../../auth/rule';
import { dam } from '../../../dam';
import { NotFoundError, UnexpectedNotFoundError } from '../../../errors';
import { Security, Tag } from '../../../openapi';
import type { ITopic, IUser, Page } from '../../../orm';
import * as orm from '../../../orm';
import { requireLogin } from '../../../pre-handler';
import prisma from '../../../prisma';
import { avatar, groupIcon } from '../../../response';
import * as Topic from '../../../topic';
import * as res from '../../../types/res';
import type { App } from '../../type';

const Group = t.Object(
  {
    id: t.Integer(),
    name: t.String(),
    nsfw: t.Boolean(),
    title: t.String(),
    icon: t.String(),
    description: t.String(),
    totalMembers: t.Integer(),
    createdAt: t.Integer(),
  },
  { $id: 'Group' },
);

type IGroupMember = Static<typeof GroupMember>;
const GroupMember = t.Object(
  {
    avatar: res.Avatar,
    id: t.Integer(),
    nickname: t.String(),
    username: t.String(),
    joinedAt: t.Integer(),
  },
  { $id: 'GroupMember' },
);

// eslint-disable-next-line @typescript-eslint/require-await
export async function setup(app: App) {
  app.addSchema(res.Error);
  app.addSchema(res.Topic);
  app.addSchema(Group);

  const GroupProfile = t.Object(
    {
      recentAddedMembers: t.Array(t.Ref(GroupMember)),
      topics: t.Array(t.Ref(res.Topic)),
      inGroup: t.Boolean({ description: '是否已经加入小组' }),
      group: t.Ref(Group),
      totalTopics: t.Integer(),
    },
    { $id: 'GroupProfile' },
  );

  app.addSchema(GroupProfile);

  app.get(
    '/groups/:groupName/profile',
    {
      schema: {
        description: '获取小组首页',
        operationId: 'getGroupProfile',
        tags: [Tag.Topic],
        params: t.Object({
          groupName: t.String({ minLength: 1 }),
        }),
        querystring: t.Object({
          limit: t.Optional(t.Integer({ default: 20 })),
          offset: t.Optional(t.Integer({ default: 0 })),
        }),
        response: {
          200: t.Ref(GroupProfile),
          404: t.Ref(res.Error, {
            description: '小组不存在',
            'x-examples': {
              NotFoundError: { value: res.formatError(NotFoundError('topic')) },
            },
          }),
        },
      },
    },
    async ({ params, auth, query }) => {
      const group = await orm.fetchGroup(params.groupName);

      if (!group) {
        throw new NotFoundError('group');
      }

      const [total, topicList] = await orm.fetchTopicList('group', group.id, query, {
        display: rule.ListTopicDisplays(auth),
      });

      const topics = await addCreators(topicList, group.id);

      return {
        group: { ...group, icon: groupIcon(group.icon) },
        totalTopics: total,
        inGroup: auth.login ? await fetchIfInGroup(group.id, auth.userID) : false,
        topics,
        recentAddedMembers: await fetchRecentMember(group.id),
      };
    },
  );

  const SubReply = t.Object(
    {
      id: t.Integer(),
      creator: t.Ref(res.User),
      createdAt: t.Integer(),
      isFriend: t.Boolean(),
      text: t.String(),
      state: t.Integer(),
    },
    { $id: 'SubReply' },
  );

  app.addSchema(SubReply);

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

  const Reply = t.Object(
    {
      id: t.Integer(),
      isFriend: t.Boolean(),
      replies: t.Array(t.Ref(SubReply)),
      creator: t.Ref(res.User),
      createdAt: t.Integer(),
      text: t.String(),
      state: t.Integer(),
    },
    { $id: 'Reply' },
  );

  app.addSchema(Reply);

  const TopicDetail = t.Object(
    {
      id: t.Integer(),
      group: t.Ref(Group),
      creator: t.Ref(res.User),
      title: t.String(),
      text: t.String(),
      state: t.Integer(),
      createdAt: t.Integer(),
      replies: t.Array(t.Ref(Reply)),
    },
    { $id: 'TopicDetail' },
  );

  app.addSchema(TopicDetail);

  app.get(
    '/groups/-/topics/:id',
    {
      schema: {
        description: '获取帖子列表',
        operationId: 'getGroupTopicDetail',
        tags: [Tag.Topic],
        params: t.Object({
          id: t.Integer({ examples: [371602] }),
        }),
        response: {
          200: t.Ref(TopicDetail),
          404: t.Ref(res.Error, {
            description: '小组不存在',
            'x-examples': {
              NotFoundError: { value: res.formatError(NotFoundError('topic')) },
            },
          }),
        },
      },
    },
    async ({ params: { id }, auth }) => {
      const topic = await orm.fetchTopicDetails('group', id);
      if (!topic) {
        throw new NotFoundError(`topic ${id}`);
      }

      const group = await orm.fetchGroupByID(topic.parentID);
      if (!group) {
        throw new UnexpectedNotFoundError(`group ${topic.parentID}`);
      }

      const userIds: number[] = [
        topic.creatorID,
        ...topic.replies.flatMap((x) => [x.creatorID, ...x.replies.map((x) => x.creatorID)]),
      ];

      const friends = await orm.fetchFriends(auth.userID);
      const users = await orm.fetchUsers([...new Set(userIds)]);

      const creator = users[topic.creatorID];
      if (!creator) {
        throw new UnexpectedNotFoundError(`user ${topic.creatorID}`);
      }

      return {
        ...topic,
        creator: userToResCreator(creator),
        text: topic.text,
        group: { ...group, icon: groupIcon(group.icon) },
        replies: topic.replies
          .map((x) => rule.filterReply(x))
          .map((x) => {
            const user = users[x.creatorID];
            if (!user) {
              throw new UnexpectedNotFoundError(`user ${x.creatorID}`);
            }
            return {
              isFriend: friends[x.creatorID] ?? false,
              ...x,
              replies: x.replies.map((x) => {
                const user = users[x.creatorID];
                if (!user) {
                  throw new UnexpectedNotFoundError(`user ${x.creatorID}`);
                }
                return {
                  isFriend: friends[x.creatorID] ?? false,
                  ...x,
                  creator: userToResCreator(user),
                };
              }),
              creator: {
                isFriend: friends[x.creatorID] ?? false,
                ...userToResCreator(user),
              },
            };
          }),
        state: topic.state,
      };
    },
  );

  app.addSchema(GroupMember);

  app.get(
    '/groups/:groupName/members',
    {
      schema: {
        description: '获取帖子列表',
        operationId: 'listGroupMembersByName',
        tags: [Tag.Topic],
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
          limit: t.Optional(t.Integer({ default: 30 })),
          offset: t.Optional(t.Integer({ default: 0 })),
        }),
        response: {
          200: res.Paged(t.Ref(GroupMember)),
          404: t.Ref(res.Error, {
            description: '小组不存在',
            'x-examples': {
              NotFoundError: { value: res.formatError(NotFoundError('topic')) },
            },
          }),
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
        tags: [Tag.Topic],
        params: t.Object({
          groupName: t.String({ minLength: 1 }),
        }),
        querystring: t.Object({
          limit: t.Optional(t.Integer({ default: 30 })),
          offset: t.Optional(t.Integer({ default: 0 })),
        }),
        response: {
          200: res.Paged(t.Ref(res.Topic)),
          404: t.Ref(res.Error, {
            description: '小组不存在',
            'x-examples': {
              NotFoundError: { value: res.formatError(NotFoundError('topic')) },
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

      const [total, topics] = await orm.fetchTopicList('group', group.id, query, {
        display: rule.ListTopicDisplays(auth),
      });

      return { total, data: await addCreators(topics, group.id) };
    },
  );

  app.get(
    '/subjects/:subjectID/topics',
    {
      schema: {
        description: '获取帖子列表',
        operationId: 'getSubjectTopicsBySubjectId',
        tags: [Tag.Topic],
        params: t.Object({
          subjectID: t.Integer({ exclusiveMinimum: 0 }),
        }),
        querystring: t.Object({
          limit: t.Optional(t.Integer({ default: 30 })),
          offset: t.Optional(t.Integer({ default: 0 })),
        }),
        response: {
          200: res.Paged(t.Ref(res.Topic)),
          404: t.Ref(res.Error, {
            description: '条目不存在',
            'x-examples': {
              NotFoundError: { value: res.formatError(NotFoundError('topic')) },
            },
          }),
        },
      },
    },
    async ({ params: { subjectID }, query, auth }) => {
      const subject = await orm.fetchSubject(subjectID);
      if (!subject) {
        throw new NotFoundError(`subject ${subjectID}`);
      }
      if (subject.nsfw && !auth.allowNsfw) {
        throw new NotFoundError(`subject ${subjectID}`);
      }

      const [total, topics] = await orm.fetchTopicList('subject', subjectID, query, {
        display: rule.ListTopicDisplays(auth),
      });
      return { total, data: await addCreators(topics, subjectID) };
    },
  );

  app.post(
    '/groups/:groupName/topics',
    {
      schema: {
        operationId: 'createNewGroupTopic',
        params: t.Object({
          groupName: t.String({ minLength: 1, examples: ['sandbox'] }),
        }),
        response: {
          200: t.Object({
            id: t.Integer({ description: 'new post topic id' }),
          }),
        },
        security: [{ [Security.CookiesSession]: [] }],
        body: t.Object(
          {
            title: t.String({ minLength: 1 }),
            content: t.String({ minLength: 1 }),
          },
          { examples: [{ title: 'post title', content: 'post contents' }] },
        ),
      },
      preHandler: [requireLogin('creating a post')],
    },
    async ({ auth, body: { content, title }, params: { groupName } }) => {
      if (auth.permission.ban_post) {
        throw new NotAllowedError('create posts');
      }

      const group = await orm.fetchGroup(groupName);
      if (!group) {
        throw new NotFoundError(`group ${groupName}`);
      }

      let display = TopicDisplay.Normal;

      if (dam.needReview(title) || dam.needReview(content)) {
        display = TopicDisplay.Review;
      }

      if (!group.accessible && !(await orm.isMemberInGroup(group.id, auth.userID))) {
        throw new NotAllowedError('create posts, join group first');
      }

      return await orm.createPostInGroup({
        title,
        content,
        display,
        userID: auth.userID,
        groupID: group.id,
        state: Topic.ReplyState.Normal,
      });
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
        response: {
          200: t.Ref(BasicReply),
        },
        security: [{ [Security.CookiesSession]: [] }],
        body: t.Object(
          {
            relatedID: t.Integer({ examples: [0], default: 0 }),
            content: t.String({ minLength: 1 }),
          },
          { examples: [{ content: 'post contents' }] },
        ),
      },
      preHandler: [requireLogin('creating a reply')],
    },
    /**
     * TODO: 给被回复人发送通知
     *
     * @param auth -
     * @param content - 回帖内容
     * @param relatedID - 子回复时的父回复ID，默认为 `0` 代表回复帖子
     * @param topicID - 帖子 ID
     */
    async ({
      auth,
      body: { content, relatedID = 0 },
      params: { topicID },
    }): Promise<Static<typeof BasicReply>> => {
      if (auth.permission.ban_post) {
        throw new NotAllowedError('create reply');
      }

      const topic = await orm.fetchTopicDetails('group', topicID);
      if (!topic) {
        throw new NotFoundError(`topic ${topicID}`);
      }

      if (relatedID) {
        const parents = topic.replies.flatMap((x) => {
          return [x.id, x.replies.map((x) => x.id)];
        });

        if (!parents.includes(relatedID)) {
          throw new NotFoundError(`parent topic id ${relatedID}`);
        }
      }

      const t = await Topic.createTopicReply({
        type: Topic.Type.group,
        topicID: topicID,
        userID: auth.userID,
        relatedID,
        content,
      });

      return {
        id: t.id,
        state: t.state,
        createdAt: t.createdAt,
        text: t.content,
        creator: userToResCreator(t.user),
      };
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
      creator: userToResCreator(x.creator),
      updatedAt: x.updatedAt,
      parentID,
    };
  });
}

async function fetchIfInGroup(groupID: number, userID: number): Promise<boolean> {
  const count = await prisma.groupMembers.count({
    where: { gmb_gid: groupID, gmb_uid: userID },
  });

  return Boolean(count);
}

async function fetchGroupMemberList(
  groupID: number,
  { limit = 30, offset = 0, type }: Page & { type: 'mod' | 'normal' | 'all' },
): Promise<[number, IGroupMember[]]> {
  const where = {
    gmb_gid: groupID,
    gmb_moderator: type === 'all' ? undefined : type === 'mod',
  } as const;
  const total = await prisma.groupMembers.count({ where });

  const members = await prisma.groupMembers.findMany({
    where,
    take: limit,
    skip: offset,
    orderBy: {
      gmb_dateline: 'desc',
    },
  });

  const users = await orm.fetchUsers(members.map((x) => x.gmb_uid));

  return [
    total,
    members.map(function (x): IGroupMember {
      const user = users[x.gmb_uid];
      if (!user) {
        throw new UnexpectedNotFoundError(`user ${x.gmb_uid}`);
      }

      return {
        avatar: avatar(user.img),
        id: user.id,
        joinedAt: x.gmb_dateline,
        nickname: user.nickname,
        username: user.username,
      };
    }),
  ];
}

async function fetchRecentMember(groupID: number): Promise<IGroupMember[]> {
  const [_, members] = await fetchGroupMemberList(groupID, { limit: 6, type: 'all' });

  return members;
}

export function userToResCreator(user: IUser): Static<typeof res.User> {
  return {
    avatar: avatar(user.img),
    username: user.username,
    nickname: user.nickname,
    id: user.id,
    sign: user.sign,
    user_group: user.groupID,
  };
}
