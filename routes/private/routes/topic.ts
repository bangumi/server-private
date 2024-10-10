import type { Static } from '@sinclair/typebox';
import { Type as t } from '@sinclair/typebox';

import type { IAuth } from '@app/lib/auth/index.ts';
import { NotAllowedError } from '@app/lib/auth/index.ts';
import config from '@app/lib/config';
import { Dam, dam } from '@app/lib/dam.ts';
import {
  BadRequestError,
  CaptchaError,
  NotFoundError,
  UnexpectedNotFoundError,
} from '@app/lib/error.ts';
import * as Like from '@app/lib/like.ts';
import { Security, Tag } from '@app/lib/openapi/index.ts';
import type { Page } from '@app/lib/orm/index.ts';
import * as orm from '@app/lib/orm/index.ts';
import { GroupMemberRepo, isMemberInGroup } from '@app/lib/orm/index.ts';
import { avatar, groupIcon } from '@app/lib/response.ts';
import { createTurnstileDriver } from '@app/lib/services/turnstile';
import type { ITopic } from '@app/lib/topic/index.ts';
import * as Topic from '@app/lib/topic/index.ts';
import {
  CommentState,
  NotJoinPrivateGroupError,
  TopicDisplay,
  Type,
} from '@app/lib/topic/index.ts';
import * as convert from '@app/lib/types/convert.ts';
import * as res from '@app/lib/types/res.ts';
import { formatErrors } from '@app/lib/types/res.ts';
import { LimitAction } from '@app/lib/utils/rate-limit';
import { requireLogin } from '@app/routes/hooks/pre-handler.ts';
import { rateLimiter } from '@app/routes/hooks/rate-limit';
import type { App } from '@app/routes/type.ts';

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

const Subject = t.Object(
  {
    id: t.Integer(),
    name: t.String(),
    typeID: t.Integer(),
    infobox: t.String(),
    platform: t.Integer(),
    summary: t.String(),
    nsfw: t.Boolean(),
    date: t.String(),
    redirect: t.Integer(),
    locked: t.Boolean(),
    image: t.String(),
  },
  { $id: 'Subject' },
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

const Reaction = t.Object(
  {
    selected: t.Boolean(),
    total: t.Integer(),
    value: t.Integer(),
  },
  { $id: 'Reaction' },
);

const SubReply = t.Object(
  {
    id: t.Integer(),
    creator: t.Ref(res.User),
    createdAt: t.Integer(),
    isFriend: t.Boolean(),
    text: t.String(),
    state: t.Integer(),
    reactions: t.Array(t.Ref(Reaction)),
  },
  { $id: 'SubReply' },
);

const Reply = t.Object(
  {
    id: t.Integer(),
    isFriend: t.Boolean(),
    replies: t.Array(t.Ref(SubReply)),
    creator: t.Ref(res.User),
    createdAt: t.Integer(),
    text: t.String(),
    state: t.Integer(),
    reactions: t.Array(t.Ref(Reaction)),
  },
  { $id: 'Reply' },
);

const TopicDetail = t.Object(
  {
    id: t.Integer(),
    parent: t.Union([t.Ref(Group), t.Ref(Subject)]),
    creator: t.Ref(res.User),
    title: t.String(),
    text: t.String(),
    state: t.Integer(),
    createdAt: t.Integer(),
    replies: t.Array(t.Ref(Reply)),
    reactions: t.Array(t.Ref(Reaction)),
  },
  { $id: 'TopicDetail' },
);

const TopicBasic = t.Object(
  {
    title: t.String({ minLength: 1 }),
    text: t.String({ minLength: 1, description: 'bbcode' }),
    'cf-turnstile-response': t.String({ minLength: 1 }),
  },
  {
    $id: 'TopicCreation',
    examples: [
      {
        title: 'topic title',
        content: 'topic content',
        'cf-turnstile-response': '10000000-aaaa-bbbb-cccc-000000000001',
      },
    ],
  },
);

// eslint-disable-next-line @typescript-eslint/require-await
export async function setup(app: App) {
  app.addSchema(res.Error);
  app.addSchema(res.Topic);
  app.addSchema(Group);
  app.addSchema(Subject);
  app.addSchema(TopicBasic);

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
          limit: t.Optional(t.Integer({ default: 20, maximum: 40 })),
          offset: t.Optional(t.Integer({ default: 0, minimum: 0 })),
        }),
        response: {
          200: t.Ref(GroupProfile),
          404: t.Ref(res.Error, {
            description: '小组不存在',
            'x-examples': {
              NotFoundError: { value: res.formatError(new NotFoundError('topic')) },
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

      const [total, topicList] = await Topic.fetchTopicList(auth, Type.group, group.id, query);

      const topics = await addCreators(topicList, group.id);

      return {
        group: { ...group, icon: groupIcon(group.icon) },
        totalTopics: total,
        inGroup: auth.login ? await orm.isMemberInGroup(group.id, auth.userID) : false,
        topics,
        recentAddedMembers: await fetchRecentMember(group.id),
      };
    },
  );

  app.addSchema(SubReply);
  app.addSchema(Reply);
  app.addSchema(Reaction);
  app.addSchema(TopicDetail);

  app.get(
    '/subjects/-/topics/:topicID',
    {
      schema: {
        tags: [Tag.Subject],
        operationId: 'getSubjectTopicDetail',
        summary: '获取帖子列表',
        params: t.Object({
          topicID: t.Integer({ examples: [1], minimum: 0 }),
        }),
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        response: {
          200: t.Ref(TopicDetail),
        },
      },
    },
    async ({ auth, params: { topicID } }) => {
      return await handleTopicDetail(auth, Type.subject, topicID);
    },
  );

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
              NotFoundError: { value: res.formatError(new NotFoundError('topic')) },
            },
          }),
        },
      },
    },
    async ({ auth, params: { id } }) => {
      return await handleTopicDetail(auth, Type.group, id);
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
          limit: t.Optional(t.Integer({ default: 30, maximum: 40 })),
          offset: t.Optional(t.Integer({ default: 0 })),
        }),
        response: {
          200: res.Paged(t.Ref(GroupMember)),
          404: t.Ref(res.Error, {
            description: '小组不存在',
            'x-examples': {
              NotFoundError: { value: res.formatError(new NotFoundError('topic')) },
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
          limit: t.Optional(t.Integer({ default: 30, maximum: 40 })),
          offset: t.Optional(t.Integer({ default: 0 })),
        }),
        response: {
          200: res.Paged(t.Ref(res.Topic)),
          404: t.Ref(res.Error, {
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

      const [total, topics] = await Topic.fetchTopicList(auth, Type.group, group.id, query);

      return { total, data: await addCreators(topics, group.id) };
    },
  );

  app.get(
    '/subjects/:subjectID/topics',
    {
      schema: {
        summary: '获取条目讨论版列表',
        operationId: 'getSubjectTopicsBySubjectId',
        tags: [Tag.Subject],
        params: t.Object({
          subjectID: t.Integer({ exclusiveMinimum: 0 }),
        }),
        querystring: t.Object({
          limit: t.Optional(t.Integer({ default: 30, maximum: 40 })),
          offset: t.Optional(t.Integer({ default: 0 })),
        }),
        response: {
          200: res.Paged(t.Ref(res.Topic)),
          404: t.Ref(res.Error, {
            description: '条目不存在',
            'x-examples': {
              NotFoundError: { value: res.formatError(new NotFoundError('topic')) },
            },
          }),
        },
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
      },
      preHandler: [requireLogin('get a topics')],
    },
    async ({ params: { subjectID }, query, auth }) => {
      const subject = await orm.fetchSubjectByID(subjectID);
      if (!subject) {
        throw new NotFoundError(`subject ${subjectID}`);
      }
      if (subject.nsfw && !auth.allowNsfw) {
        throw new NotFoundError(`subject ${subjectID}`);
      }

      const [total, topics] = await Topic.fetchTopicList(auth, Type.subject, subjectID, query);
      return { total, data: await addCreators(topics, subjectID) };
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
        body: t.Ref(TopicBasic),
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
        state: Topic.CommentState.Normal,
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
          400: t.Ref(res.Error),
          401: t.Ref(res.Error, {
            'x-examples': formatErrors(new NotAllowedError('edit a topic')),
          }),
        },
        security: [{ [Security.CookiesSession]: [] }],
        body: t.Ref(TopicBasic),
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

      const topic = await Topic.fetchTopicDetail(auth, Type.group, topicID);
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

  const turnstile = createTurnstileDriver(config.turnstile.secretKey);

  app.post(
    '/subjects/:subjectID/topics',
    {
      schema: {
        summary: '创建条目讨论版',
        description: `需要 [turnstile](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/)

next.bgm.tv 域名对应的 site-key 为 \`0x4AAAAAAABkMYinukE8nzYS\`

dev.bgm38.com 域名使用测试用的 site-key \`1x00000000000000000000AA\``,
        tags: [Tag.Subject],
        operationId: 'createNewSubjectTopic',
        params: t.Object({
          subjectID: t.Integer({ examples: [114514], minimum: 0 }),
        }),
        response: {
          200: t.Object({
            id: t.Integer({ description: 'new topic id' }),
          }),
        },
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        body: t.Ref(TopicBasic),
      },
      preHandler: [requireLogin('creating a topic'), rateLimiter(LimitAction.Subject)],
    },
    async ({
      auth,
      body: { text, title, 'cf-turnstile-response': cfCaptchaResponse },
      params: { subjectID },
    }) => {
      if (!(await turnstile.verify(cfCaptchaResponse))) {
        throw new CaptchaError();
      }

      if (!Dam.allCharacterPrintable(text)) {
        throw new BadRequestError('text contains invalid invisible character');
      }

      if (auth.permission.ban_post) {
        throw new NotAllowedError('create topic');
      }

      const subject = await orm.fetchSubjectByID(subjectID);
      if (!subject) {
        throw new NotFoundError(`subject ${subjectID}`);
      }

      let display = TopicDisplay.Normal;

      if (dam.needReview(title) || dam.needReview(text)) {
        display = TopicDisplay.Review;
      }

      return await orm.createPost({
        title,
        content: text,
        display,
        userID: auth.userID,
        parentID: subject.id,
        state: Topic.CommentState.Normal,
        topicType: 'subject',
      });
    },
  );

  app.put(
    '/subjects/-/topics/:topicID',
    {
      schema: {
        summary: '编辑自己创建的条目讨论版',
        operationId: 'editSubjectTopic',
        params: t.Object({
          topicID: t.Integer({ examples: [371602] }),
        }),
        tags: [Tag.Subject],
        response: {
          200: t.Object({}),
          400: t.Ref(res.Error),
          401: t.Ref(res.Error, {
            'x-examples': formatErrors(new NotAllowedError('edit a topic')),
          }),
        },
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        body: t.Ref(TopicBasic),
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

      const topic = await Topic.fetchTopicDetail(auth, Type.subject, topicID);
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

      await orm.SubjectTopicRepo.update({ id: topicID }, { title, display });

      const topicPost = await orm.SubjectPostRepo.findOneBy({ topicID });

      if (topicPost) {
        await orm.SubjectPostRepo.update({ id: topicPost.id }, { content: text });
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
): Promise<[number, IGroupMember[]]> {
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
    members.map(function (x): IGroupMember {
      const user = users[x.gmbUid];
      if (!user) {
        throw new UnexpectedNotFoundError(`user ${x.gmbUid}`);
      }

      return {
        avatar: avatar(user.img),
        id: user.id,
        joinedAt: x.gmbDateline,
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

export async function handleTopicDetail(
  auth: IAuth,
  type: Type,
  id: number,
): Promise<Static<typeof TopicDetail>> {
  const topic = await Topic.fetchTopicDetail(auth, type, id);
  if (!topic) {
    throw new NotFoundError(`topic ${id}`);
  }

  let parent: orm.IGroup | orm.ISubject | null;
  switch (type) {
    case Type.group: {
      parent = await orm.fetchGroupByID(topic.parentID);
      break;
    }
    case Type.subject: {
      parent = await orm.fetchSubjectByID(topic.parentID);
      break;
    }
    default: {
      parent = null;
    }
  }
  if (!parent) {
    throw new UnexpectedNotFoundError(`parent ${topic.parentID}`);
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

  const reactions = await Like.fetchTopicReactions(id, auth.userID);

  return {
    ...topic,
    creator: convert.oldToUser(creator),
    text: topic.text,
    parent: {
      ...parent,
      icon: type === Type.group ? groupIcon((parent as orm.IGroup).icon) : '',
    },
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
