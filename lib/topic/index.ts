import { createError } from '@fastify/error';
import { DateTime } from 'luxon';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity.d.ts';

import type { IAuth } from '@app/lib/auth/index.ts';
import { UnexpectedNotFoundError, UnimplementedError } from '@app/lib/error.ts';
import * as orm from '@app/lib/orm';
import * as entity from '@app/lib/orm/entity/index.ts';
import type { IBaseReply, IUser, Page } from '@app/lib/orm/index.ts';
import {
  AppDataSource,
  fetchUserX,
  GroupPostRepo,
  GroupTopicRepo,
  SubjectPostRepo,
  SubjectTopicRepo,
} from '@app/lib/orm/index.ts';
import { CanViewTopicContent, filterReply, ListTopicDisplays } from '@app/lib/topic/display.ts';

export { CanViewTopicContent, ListTopicDisplays } from './display.ts';

export const enum Type {
  group = 'group',
  subject = 'subject',
}

export const enum CommentState {
  Normal = 0, // 正常
  // CommentStateAdminCloseTopic 管理员关闭主题 https://bgm.tv/subject/topic/12629#post_108127
  AdminCloseTopic = 1, // 关闭
  AdminReopen = 2, // 重开
  AdminPin = 3, // 置顶
  AdminMerge = 4, // 合并
  // CommentStateAdminSilentTopic 管理员下沉 https://bgm.tv/subject/topic/18784#post_160402
  AdminSilentTopic = 5, // 下沉
  UserDelete = 6, // 自行删除
  AdminDelete = 7, // 管理员删除
  AdminOffTopic = 8, // 折叠
}

export const enum TopicDisplay {
  Ban = 0, // 软删除
  Normal = 1,
  Review = 2,
}

interface IPost {
  id: number;
  user: IUser;
  createdAt: number;
  state: CommentState;
  content: string;
  topicID: number;
  type: Type;
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
  type: Type,
  id: number,
): Promise<ITopicDetails | null> {
  let topic: orm.entity.GroupTopic | orm.entity.SubjectTopic | null;
  switch (type) {
    case Type.group: {
      topic = await GroupTopicRepo.findOne({ where: { id: id } });
      break;
    }
    case Type.subject: {
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

  if (!CanViewTopicContent(auth, topic)) {
    return null;
  }

  let replies: orm.entity.GroupPost[] | orm.entity.SubjectPost[];
  switch (type) {
    case Type.group: {
      replies = await GroupPostRepo.find({ where: { topicID: topic.id } });
      break;
    }
    case Type.subject: {
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
}

export async function fetchTopicList(
  auth: IAuth,
  topicType: Type,
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
    case Type.group: {
      total = await GroupTopicRepo.count({ where });
      topics = await GroupTopicRepo.find({
        where,
        order: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      });
      break;
    }
    case Type.subject: {
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
  topicType: Type;
  topicID: number;
  userID: number;
  content: string;
  parentID: number;
  state?: CommentState;
}): Promise<IPost> {
  const now = DateTime.now();

  const p = await AppDataSource.transaction(async (t) => {
    const postRepo =
      topicType === Type.group
        ? t.getRepository(entity.GroupPost)
        : t.getRepository(entity.SubjectPost);
    const topicRepo =
      topicType === Type.group
        ? t.getRepository(entity.GroupTopic)
        : t.getRepository(entity.SubjectTopic);

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

    if (topicType === Type.subject) {
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
    type: Type.group,
    user: await fetchUserX(p.uid),
    createdAt: p.dateline,
    state: p.state,
    topicID: p.topicID,
    content: p.content,
  };
}

function scoredUpdateTime(timestamp: number, type: Type, main_info: entity.GroupTopic): number {
  if (type === Type.group && [364].includes(main_info.parentID) && main_info.replies > 0) {
    const $created_at = main_info.createdAt;
    const $created_hours = (timestamp - $created_at) / 3600;
    const $gravity = 1.8;
    const $base_score = (Math.pow($created_hours + 0.1, $gravity) / main_info.replies) * 200;
    const $scored_last_post = Math.trunc(timestamp - $base_score);
    return Math.min($scored_last_post, timestamp);
  }

  return timestamp;
}
