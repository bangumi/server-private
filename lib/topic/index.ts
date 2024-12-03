import { createError } from '@fastify/error';
import { DateTime } from 'luxon';
import type { Repository } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity.d.ts';

import type { IAuth } from '@app/lib/auth/index.ts';
import { Dam } from '@app/lib/dam.ts';
import {
  BadRequestError,
  NotFoundError,
  UnexpectedNotFoundError,
  UnimplementedError,
} from '@app/lib/error.ts';
import * as Notify from '@app/lib/notify.ts';
import * as orm from '@app/lib/orm';
import * as entity from '@app/lib/orm/entity/index.ts';
import type { IBaseReply, IUser, Page } from '@app/lib/orm/index.ts';
import {
  AppDataSource,
  fetchUserX,
  GroupPostRepo,
  GroupRepo,
  GroupTopicRepo,
  SubjectPostRepo,
  SubjectTopicRepo,
} from '@app/lib/orm/index.ts';
import { CanViewTopicContent, filterReply, ListTopicDisplays } from '@app/lib/topic/display.ts';
import * as convert from '@app/lib/types/convert.ts';
import { LimitAction } from '@app/lib/utils/rate-limit/index.ts';
import { rateLimit } from '@app/routes/hooks/rate-limit.ts';
import type { IBasicReply } from '@app/routes/private/routes/post.ts';

import { NotAllowedError } from './../auth/index';
import { CommentState, TopicParentType } from './type.ts';

interface IPost {
  id: number;
  user: IUser;
  createdAt: number;
  state: CommentState;
  content: string;
  topicID: number;
  type: TopicParentType;
}

export type ISubReply = IBaseReply;

export interface IReply extends IBaseReply {
  replies: ISubReply[];
}

export interface ITopicDetails {
  id: number;
  title: string;
  text: string;
  display: number;
  state: number;
  createdAt: number;
  creatorID: number;
  // group ID or subject ID
  parentID: number;
  replies: IReply[];

  contentPost: { id: number };
}

export async function fetchTopicDetail(
  auth: IAuth,
  type: TopicParentType,
  id: number,
): Promise<ITopicDetails | null> {
  let topic: orm.entity.GroupTopic | orm.entity.SubjectTopic | null;
  switch (type) {
    case TopicParentType.Group: {
      topic = await GroupTopicRepo.findOne({ where: { id: id } });
      break;
    }
    case TopicParentType.Subject: {
      topic = await SubjectTopicRepo.findOne({ where: { id: id } });
      break;
    }
    default: {
      return null;
    }
  }

  if (!topic) {
    return null;
  }

  if (!CanViewTopicContent(auth, topic.state, topic.display, topic.creatorID)) {
    return null;
  }

  let replies: orm.entity.GroupPost[] | orm.entity.SubjectPost[];
  switch (type) {
    case TopicParentType.Group: {
      replies = await GroupPostRepo.find({ where: { topicID: topic.id } });
      break;
    }
    case TopicParentType.Subject: {
      replies = await SubjectPostRepo.find({ where: { topicID: topic.id } });
      break;
    }
    default: {
      replies = [];
    }
  }

  const top = replies.shift();
  if (!top) {
    throw new UnexpectedNotFoundError(`top reply of topic(${type}) ${id}`);
  }

  const subReplies: Record<number, ISubReply[]> = {};

  for (const x of replies.filter((x) => x.related !== 0)) {
    const sub: ISubReply = {
      id: x.id,
      repliedTo: x.related,
      creatorID: x.uid,
      text: x.content,
      state: x.state,
      createdAt: x.dateline,
    };

    const subR = subReplies[x.related] ?? [];
    subR.push(sub);
    subReplies[x.related] = subR;
  }

  const topLevelReplies = replies
    .filter((x) => x.related === 0)
    .map(function (x): IReply {
      return {
        id: x.id,
        replies: subReplies[x.id] ?? ([] as ISubReply[]),
        creatorID: x.uid,
        text: x.content,
        state: x.state,
        createdAt: x.dateline,
        repliedTo: x.related,
      };
    })
    .map((x) => filterReply(x));

  return {
    contentPost: top,
    id: topic.id,
    title: topic.title,
    parentID: topic.parentID,
    text: top.content,
    display: topic.display,
    state: topic.state,
    replies: topLevelReplies,
    creatorID: top.uid,
    createdAt: top.dateline,
  } satisfies ITopicDetails;
}

export interface ITopic {
  id: number;
  parentID: number;
  creatorID: number;
  updatedAt: number;
  createdAt: number;
  title: string;
  repliesCount: number;
  state: number;
  display: number;
}

export async function fetchTopicList(
  auth: IAuth,
  topicType: TopicParentType,
  id: number,
  { limit = 30, offset = 0 }: Page,
): Promise<[number, ITopic[]]> {
  const where = {
    parentID: id,
    display: orm.In(ListTopicDisplays(auth)),
  } as const;

  let total = 0;
  let topics: entity.GroupTopic[] | entity.SubjectTopic[];
  switch (topicType) {
    case TopicParentType.Group: {
      total = await GroupTopicRepo.count({ where });
      topics = await GroupTopicRepo.find({
        where,
        order: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      });
      break;
    }
    case TopicParentType.Subject: {
      total = await SubjectTopicRepo.count({ where });
      topics = await SubjectTopicRepo.find({
        where,
        order: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      });
      break;
    }
    default: {
      throw new UnimplementedError('unsupported topic type');
    }
  }

  return [
    total,
    topics.map((x) => {
      return {
        id: x.id,
        parentID: x.parentID,
        creatorID: x.creatorID,
        title: x.title,
        createdAt: x.createdAt,
        updatedAt: x.updatedAt,
        repliesCount: x.replies,
        state: x.state,
        display: x.display,
      };
    }),
  ];
}

export const NotJoinPrivateGroupError = createError(
  'NOT_JOIN_PRIVATE_GROUP_ERROR',
  `you need to join private group '%s' before you create a post or reply`,
  401,
);

export async function createTopicReply({
  topicType,
  topicID,
  userID,
  content,
  parentID,
  state = CommentState.Normal,
}: {
  topicType: TopicParentType;
  topicID: number;
  userID: number;
  content: string;
  parentID: number;
  state?: CommentState;
}): Promise<IPost> {
  const now = DateTime.now();

  const p = await AppDataSource.transaction(async (t) => {
    let postRepo: Repository<entity.GroupPost> | Repository<entity.SubjectPost>;
    let topicRepo: Repository<entity.GroupTopic> | Repository<entity.SubjectTopic>;

    switch (topicType) {
      case TopicParentType.Group: {
        postRepo = t.getRepository(entity.GroupPost);
        topicRepo = t.getRepository(entity.GroupTopic);
        break;
      }
      case TopicParentType.Subject: {
        postRepo = t.getRepository(entity.SubjectPost);
        topicRepo = t.getRepository(entity.SubjectTopic);
        break;
      }
    }

    const topic = await topicRepo.findOneOrFail({ where: { id: topicID } });
    const posts = await postRepo.countBy({ topicID, state: CommentState.Normal });

    // 创建回帖
    const post = await postRepo.save({
      topicID: topicID,
      content,
      uid: userID,
      related: parentID,
      state,
      dateline: now.toUnixInteger(),
    });

    let topicUpdate = {
      replies: posts,
    } as QueryDeepPartialEntity<entity.GroupTopic>;

    if (topicType === TopicParentType.Subject) {
      topicUpdate = {
        replies: posts,
      } as QueryDeepPartialEntity<entity.SubjectTopic>;
    }

    if (topic.state !== CommentState.AdminSilentTopic) {
      topicUpdate.updatedAt = scoredUpdateTime(now.toUnixInteger(), topicType, topic);
    }

    await topicRepo.update({ id: topic.id }, topicUpdate);

    return post;
  });

  return {
    id: p.id,
    type: topicType,
    user: await fetchUserX(p.uid),
    createdAt: p.dateline,
    state: p.state,
    topicID: p.topicID,
    content: p.content,
  };
}

function scoredUpdateTime(
  timestamp: number,
  type: TopicParentType,
  main_info: entity.GroupTopic,
): number {
  if (
    type === TopicParentType.Group &&
    [364].includes(main_info.parentID) &&
    main_info.replies > 0
  ) {
    const $created_at = main_info.createdAt;
    const $created_hours = (timestamp - $created_at) / 3600;
    const $gravity = 1.8;
    const $base_score = (Math.pow($created_hours + 0.1, $gravity) / main_info.replies) * 200;
    const $scored_last_post = Math.trunc(timestamp - $base_score);
    return Math.min($scored_last_post, timestamp);
  }

  return timestamp;
}

export async function handleTopicReply(
  auth: IAuth,
  topicType: TopicParentType,
  topicID: number,
  content: string,
  replyTo: number,
): Promise<IBasicReply> {
  if (!Dam.allCharacterPrintable(content)) {
    throw new BadRequestError('text contains invalid invisible character');
  }

  if (auth.permission.ban_post) {
    throw new NotAllowedError('create reply');
  }

  const topic = await fetchTopicDetail(auth, topicType, topicID);
  if (!topic) {
    throw new NotFoundError(`topic ${topicID}`);
  }
  if (topic.state === CommentState.AdminCloseTopic) {
    throw new NotAllowedError('reply to a closed topic');
  }

  const now = DateTime.now();

  let parentID = 0;
  let dstUserID = topic.creatorID;
  if (replyTo) {
    const parents: Record<number, IBaseReply> = Object.fromEntries(
      topic.replies.flatMap((x): [number, IBaseReply][] => {
        if (
          [
            CommentState.AdminCloseTopic,
            CommentState.AdminReopen,
            CommentState.AdminSilentTopic,
          ].includes(x.state)
        ) {
          return [];
        }
        return [[x.id, x], ...x.replies.map((x): [number, IBaseReply] => [x.id, x])];
      }),
    );

    const replied = parents[replyTo];

    if (!replied) {
      throw new NotFoundError(`parent post id ${replyTo}`);
    }

    dstUserID = replied.creatorID;
    parentID = replied.repliedTo || replied.id;
  }

  if (topicType === TopicParentType.Group) {
    const group = await GroupRepo.findOneOrFail({
      where: { id: topic.parentID },
    });

    if (!group.accessible && !(await orm.isMemberInGroup(group.id, auth.userID))) {
      throw new NotJoinPrivateGroupError(group.name);
    }
  }

  await rateLimit(LimitAction.Subject, auth.userID);

  const t = await createTopicReply({
    topicType,
    topicID,
    userID: auth.userID,
    content,
    parentID,
  });

  let notifyType;
  switch (topicType) {
    case TopicParentType.Group: {
      notifyType = replyTo === 0 ? Notify.Type.GroupTopicReply : Notify.Type.GroupPostReply;
      break;
    }
    case TopicParentType.Subject: {
      notifyType = replyTo === 0 ? Notify.Type.SubjectTopicReply : Notify.Type.SubjectPostReply;
      break;
    }
    default: {
      throw new Error('unsupported topic type');
    }
  }

  await Notify.create({
    destUserID: dstUserID,
    sourceUserID: auth.userID,
    now,
    type: notifyType,
    postID: t.id,
    topicID: topic.id,
    title: topic.title,
  });

  return {
    id: t.id,
    state: t.state,
    createdAt: t.createdAt,
    text: t.content,
    creator: convert.oldToUser(t.user),
  };
}
