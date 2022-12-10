import type { Static } from '@sinclair/typebox';
import { Type as t } from '@sinclair/typebox';

import { NotFoundError } from '../../../errors';
import { Tag } from '../../../openapi';
import type { ITopic } from '../../../orm';
import { addCreator, fetchGroup, fetchSubject, fetchTopic } from '../../../orm';
import { avatar } from '../../../response';
import { ErrorRes, formatError, Paged, Topic } from '../../../types';
import type { App } from '../../type';

// eslint-disable-next-line @typescript-eslint/require-await
export async function setup(app: App) {
  app.addSchema(ErrorRes);
  app.addSchema(Topic);

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
    async ({ params, query }) => {
      const group = await fetchGroup(params.groupName);

      if (!group) {
        throw new NotFoundError('group');
      }

      const [total, topics] = await fetchTopic('group', group.id, query);

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
    async ({ params: { subjectID }, query }) => {
      const subject = await fetchSubject(subjectID);

      if (!subject) {
        throw new NotFoundError(`subject ${subjectID}`);
      }

      const [total, topics] = await fetchTopic('subject', subjectID, query);
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
