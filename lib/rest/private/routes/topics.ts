import type { Static } from '@sinclair/typebox';
import { Type as t } from '@sinclair/typebox';

import { rule } from '../../../auth/rule';
import { NotFoundError, UnexpectedNotFoundError } from '../../../errors';
import { Tag } from '../../../openapi';
import type { ITopic, IUser } from '../../../orm';
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
import type { ICreator } from '../../../types';
import { Creator, ErrorRes, formatError, Paged, Topic } from '../../../types';
import type { App } from '../../type';

const Group = t.Object({
  id: t.Integer(),
  name: t.String(),
  nsfw: t.Boolean(),
  title: t.String(),
  icon: t.String(),
  summary: t.String(),
  createdAt: t.Integer(),
});

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
        response: {
          200: t.Object({
            recentAddedMembers: t.Array(Creator),
            topics: t.Array(t.Ref(Topic)),
            inGroup: t.Boolean({ description: '是否已经加入小组' }),
            group: Group,
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
    async ({ params, auth }) => {
      const group = await fetchGroup(params.groupName);

      if (!group) {
        throw new NotFoundError('group');
      }

      const [total, topics] = await fetchTopicList(
        'group',
        group.id,
        { limit: 20 },
        {
          display: rule.ListTopicDisplays(auth),
        },
      );

      return {
        group: { ...group, icon: groupIcon(group.icon) },
        total,
        inGroup: auth.user?.id ? await fetchIfInGroup(group.id, auth.user.id) : false,
        topics: await addCreators(topics, group.id),
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
            group: Group,
            replies: t.Array(
              t.Object({
                id: t.Integer(),
                replies: t.Array(
                  t.Object({
                    id: t.Integer(),
                    creator: t.Intersect([
                      Creator,
                      t.Object({
                        isFriend: t.Boolean(),
                      }),
                    ]),
                    createdAt: t.Integer(),
                    text: t.String(),
                    state: t.Integer(),
                  }),
                ),
                creator: t.Intersect([
                  Creator,
                  t.Object({
                    isFriend: t.Boolean(),
                  }),
                ]),
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

      const userIds: number[] = topic.replies.flatMap((x) => [
        x.creatorID,
        ...x.replies.map((x) => x.creatorID),
      ]);

      const friends = await fetchFriends(auth.user?.id);
      const users = await fetchUsers(userIds);

      return {
        group: { ...group, icon: groupIcon(group.icon) },
        replies: topic.replies
          .map((x) => rule.filterReply(x))
          .map((x) => {
            const user = users[x.creatorID];
            if (!user) {
              throw new UnexpectedNotFoundError(`user ${x.creatorID}`);
            }
            return {
              ...x,
              replies: x.replies.map((x) => {
                const user = users[x.creatorID];
                if (!user) {
                  throw new UnexpectedNotFoundError(`user ${x.creatorID}`);
                }
                return {
                  ...x,
                  creator: {
                    isFriend: friends[x.creatorID] ?? false,
                    ...userToResCreator(user),
                  },
                };
              }),
              creator: {
                isFriend: friends[x.creatorID] ?? false,
                ...userToResCreator(user),
              },
            };
          }),
      };
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
      creator: {
        ...x.creator,
        avatar: avatar(x.creator.img),
      },
      lastRepliedAt: new Date(x.lastRepliedAt * 1000).toISOString(),
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

async function fetchRecentMember(groupID: number): Promise<Static<typeof Creator>[]> {
  const members = await prisma.groupMembers.findMany({
    where: { gmb_gid: groupID },
    take: 6,
    orderBy: {
      gmb_dateline: 'desc',
    },
  });

  const users = await fetchUsers(members.map((x) => x.gmb_uid));

  return members.map((x) => {
    const user = users[x.gmb_uid];
    if (!user) {
      throw new UnexpectedNotFoundError(`user ${x.gmb_uid}`);
    }

    return userToResCreator(user);
  });
}

function userToResCreator(user: IUser): ICreator {
  return {
    avatar: avatar(user.img),
    username: user.username,
    nickname: user.nickname,
    id: user.id,
  };
}
