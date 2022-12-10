import type { Static } from '@sinclair/typebox';
import { Type as t } from '@sinclair/typebox';

import { rule } from '../../../auth/rule';
import { NotFoundError, UnexpectedNotFoundError } from '../../../errors';
import { Tag } from '../../../openapi';
import type { ITopic } from '../../../orm';
import { addCreator, fetchGroup, fetchSubject, fetchTopic, fetchUsers } from '../../../orm';
import prisma from '../../../prisma';
import { avatar } from '../../../response';
import { Creator, ErrorRes, formatError, Paged, Topic } from '../../../types';
import type { App } from '../../type';

// eslint-disable-next-line @typescript-eslint/require-await
export async function setup(app: App) {
  app.addSchema(ErrorRes);
  app.addSchema(Topic);

  app.get(
    '/groups/:groupName/profile',
    {
      schema: {
        description: '获取小组首页',
        operationId: 'get-group-topics-by-group-name',
        tags: [Tag.Topic],
        params: t.Object({
          groupName: t.String({ minLength: 1 }),
        }),
        response: {
          200: t.Object({
            recentAddedMembers: t.Array(Creator),
            topics: t.Array(t.Ref(Topic)),
            group: t.Object({
              id: t.Integer(),
              name: t.String(),
              nsfw: t.Boolean(),
              summary: t.String(),
              createdAt: t.Integer(),
            }),
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

      const [total, topics] = await fetchTopic(
        'group',
        group.id,
        { limit: 20 },
        {
          display: rule.ListTopicDisplays(auth),
        },
      );

      return {
        group: group,
        total,
        topics: await addCreators(topics, group.id),
        recentAddedMembers: await fetchRecentMember(group.id),
      };
    },
  );

  app.get(
    '/groups/:groupName/topics',
    {
      schema: {
        description: '获取帖子列表',
        operationId: 'get-group-topics-by-group-name',
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

      const [total, topics] = await fetchTopic('group', group.id, query, {
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
        operationId: 'get-subject-topics-by-subject-id',
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

      const [total, topics] = await fetchTopic('subject', subjectID, query, {
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

    return {
      avatar: avatar(user.img),
      username: user.username,
      nickname: user.nickname,
      id: user.id,
    };
  });
}
