import type { Static } from '@sinclair/typebox';
import { Type as t } from '@sinclair/typebox';

import { rule } from '../../../auth/rule';
import { NotFoundError, UnexpectedNotFoundError } from '../../../errors';
import { Tag } from '../../../openapi';
import type { ITopic, IUser, Page } from '../../../orm';
import {
  addCreator,
  fetchGroup,
  fetchSubject,
  fetchTopicList,
  fetchTopicDetails,
  fetchUsers,
  fetchGroupByID,
  fetchFriends,
} from '../../../orm';
import prisma from '../../../prisma';
import { avatar, groupIcon } from '../../../response';
import { Avatar, User, ErrorRes, formatError, Paged, Topic } from '../../../types';
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
    avatar: Avatar,
    id: t.Integer(),
    nickname: t.String(),
    username: t.String(),
    joinedAt: t.Integer(),
  },
  { $id: 'GroupMember' },
);

// eslint-disable-next-line @typescript-eslint/require-await
export async function setup(app: App) {
  app.addSchema(ErrorRes);
  app.addSchema(Topic);

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
          200: t.Object({
            recentAddedMembers: t.Array(GroupMember),
            topics: t.Array(t.Ref(Topic)),
            inGroup: t.Boolean({ description: '是否已经加入小组' }),
            group: Group,
            totalTopics: t.Integer(),
          }),
          404: t.Ref(ErrorRes, {
            description: '小组不存在',
            'x-examples': {
              NotFoundError: { value: formatError(NotFoundError('topic')) },
            },
          }),
        },
      },
    },
    async ({ params, auth, query }) => {
      const group = await fetchGroup(params.groupName);

      if (!group) {
        throw new NotFoundError('group');
      }

      const [total, topicList] = await fetchTopicList('group', group.id, query, {
        display: rule.ListTopicDisplays(auth),
      });

      const topics = await addCreators(topicList, group.id);

      return {
        group: { ...group, icon: groupIcon(group.icon) },
        totalTopics: total,
        inGroup: auth.user?.id ? await fetchIfInGroup(group.id, auth.user.id) : false,
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
        operationId: 'getGroupTopic',
        tags: [Tag.Topic],
        params: t.Object({
          id: t.Integer({}),
        }),
        response: {
          200: t.Object({
            id: t.Integer(),
            group: Group,
            creator: User,
            title: t.String(),
            text: t.String(),
            state: t.Integer(),
            createdAt: t.Integer(),
            replies: t.Array(
              t.Object({
                id: t.Integer(),
                isFriend: t.Boolean(),
                replies: t.Array(
                  t.Object({
                    id: t.Integer(),
                    creator: User,
                    createdAt: t.Integer(),
                    isFriend: t.Boolean(),
                    text: t.String(),
                    state: t.Integer(),
                  }),
                ),
                creator: User,
                createdAt: t.Integer(),
                text: t.String(),
                state: t.Integer(),
              }),
            ),
          }),
          404: t.Ref(ErrorRes, {
            description: '小组不存在',
            'x-examples': {
              NotFoundError: { value: formatError(NotFoundError('topic')) },
            },
          }),
        },
      },
    },
    async ({ params: { id }, auth }) => {
      const topic = await fetchTopicDetails('group', id);
      if (!topic) {
        throw new NotFoundError(`topic ${id}`);
      }

      const group = await fetchGroupByID(topic.parentID);
      if (!group) {
        throw new UnexpectedNotFoundError(`group ${topic.parentID}`);
      }

      const userIds: number[] = [
        topic.creatorID,
        ...topic.replies.flatMap((x) => [x.creatorID, ...x.replies.map((x) => x.creatorID)]),
      ];

      const friends = await fetchFriends(auth.user?.id);
      const users = await fetchUsers([...new Set(userIds)]);

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
          200: Paged(t.Ref(GroupMember)),
          404: t.Ref(ErrorRes, {
            description: '小组不存在',
            'x-examples': {
              NotFoundError: { value: formatError(NotFoundError('topic')) },
            },
          }),
        },
      },
    },
    async ({ params, query: { type = 'all', limit, offset } }) => {
      const group = await fetchGroup(params.groupName);

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
          200: Paged(t.Ref(Topic)),
          404: t.Ref(ErrorRes, {
            description: '小组不存在',
            'x-examples': {
              NotFoundError: { value: formatError(NotFoundError('topic')) },
            },
          }),
        },
      },
    },
    async ({ params, query, auth }) => {
      const group = await fetchGroup(params.groupName);

      if (!group) {
        throw new NotFoundError('group');
      }

      const [total, topics] = await fetchTopicList('group', group.id, query, {
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
          200: Paged(t.Ref(Topic)),
          404: t.Ref(ErrorRes, {
            description: '条目不存在',
            'x-examples': {
              NotFoundError: { value: formatError(NotFoundError('topic')) },
            },
          }),
        },
      },
    },
    async ({ params: { subjectID }, query, auth }) => {
      const subject = await fetchSubject(subjectID);
      if (!subject) {
        throw new NotFoundError(`subject ${subjectID}`);
      }
      if (subject.nsfw && !auth.allowNsfw) {
        throw new NotFoundError(`subject ${subjectID}`);
      }

      const [total, topics] = await fetchTopicList('subject', subjectID, query, {
        display: rule.ListTopicDisplays(auth),
      });
      return { total, data: await addCreators(topics, subjectID) };
    },
  );
}

async function addCreators(topics: ITopic[], parentID: number): Promise<Static<typeof Topic>[]> {
  const withCreator = await addCreator(topics);

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

  const users = await fetchUsers(members.map((x) => x.gmb_uid));

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

export function userToResCreator(user: IUser): Static<typeof User> {
  return {
    avatar: avatar(user.img),
    username: user.username,
    nickname: user.nickname,
    id: user.id,
    sign: user.sign,
    user_group: user.groupID,
  };
}
