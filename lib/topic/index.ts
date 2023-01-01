import { createError } from '@fastify/error';
import dayjs from 'dayjs';

import type { IAuth } from '@app/lib/auth';
import { UnimplementedError } from '@app/lib/error';
import type { IUser, Page, ITopic } from '@app/lib/orm';
import * as orm from '@app/lib/orm';
import { fetchUserX, AppDataSource, GroupPostRepo } from '@app/lib/orm';
import * as entity from '@app/lib/orm/entity';
import { ListTopicDisplays } from '@app/lib/topic/display';

export { fetchTopicDetails } from './topic';
export type { ITopicDetails } from './topic';
export type { IReply } from './topic';
export type { ISubReply } from './topic';

export { ListTopicDisplays, CanViewTopicContent } from './display';

export const enum Type {
  group = 'group',
  subject = 'subject',
}

export const enum ReplyState {
  Normal = 0, // 正常
  // AdminCloseTopic 管理员关闭主题 https://bgm.tv/subject/topic/12629#post_108127
  AdminCloseTopic = 1, // 关闭
  AdminReopen = 2, // 重开
  AdminPin = 3, // 置顶
  AdminMerge = 4, // 合并
  // AdminSilentTopic 管理员下沉 https://bgm.tv/subject/topic/18784#post_160402
  AdminSilentTopic = 5, // 下沉
  UserDelete = 6, // 自行删除
  AdminDelete = 7, // 管理员删除
}

export const enum CommentState {
  None = 0, // 正常
  // CommentStateAdminCloseTopic 管理员关闭主题 https://bgm.tv/subject/topic/12629#post_108127
  AdminCloseTopic = 1, // 关闭
  AdminReopen = 2, // 重开
  AdminPin = 3, // 置顶
  AdminMerge = 4, // 合并
  // CommentStateAdminSilentTopic 管理员下沉 https://bgm.tv/subject/topic/18784#post_160402
  AdminSilentTopic = 5, // 下沉
  UserDelete = 6, // 自行删除
  AdminDelete = 7, // 管理员删除
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
  state: ReplyState;
  content: string;
  topicID: number;
  type: Type;
}

async function getSubjectTopic(id: number): Promise<IPost | null> {
  const p = await GroupPostRepo.findOne({
    where: {
      id,
    },
  });

  if (!p) {
    return null;
  }

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

export async function fetchTopicList(
  auth: IAuth,
  type: 'group' | 'subject',
  id: number,
  { limit = 30, offset = 0 }: Page,
): Promise<[number, ITopic[]]> {
  const [total, topicList] = await orm.fetchTopicList(
    'group',
    id,
    { limit, offset },
    {
      display: ListTopicDisplays(auth),
    },
  );

  return [total, topicList];
}

export async function getPost(type: Type, id: number): Promise<IPost | null> {
  if (type === Type.group) {
    return await getSubjectTopic(id);
  }

  throw new UnimplementedError(`topic ${type}`);
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
  state = ReplyState.Normal,
}: {
  topicType: Type;
  topicID: number;
  userID: number;
  content: string;
  parentID: number;
  state?: ReplyState;
}): Promise<IPost> {
  if (topicType !== Type.group) {
    throw new UnimplementedError('creating group reply');
  }

  const now = dayjs();

  const p = await AppDataSource.transaction(async (t) => {
    const GroupPostRepo = t.getRepository(entity.GroupPost);
    const GroupTopicRepo = t.getRepository(entity.GroupTopic);

    const topic = await GroupTopicRepo.findOneOrFail({ where: { id: topicID } });

    // 创建回帖
    const post = await GroupPostRepo.save({
      topicID: topicID,
      content,
      uid: userID,
      related: parentID,
      state,
      dateline: now.unix(),
    });

    const topicUpdate = {
      replies: topic.replies + 1,
      dateline: undefined as undefined | number,
    };

    if (topic.state !== ReplyState.AdminSilentTopic) {
      topicUpdate.dateline = scoredUpdateTime(now.unix(), topicType, topic);
    }

    await GroupTopicRepo.update({ id: topic.id }, topicUpdate);

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
  if (type === Type.group && [364].includes(main_info.id) && main_info.replies > 0) {
    const $created_at = main_info.dateline;
    const $created_hours = (timestamp - $created_at) / 3600;
    const $gravity = 1.8;
    const $base_score = (Math.pow($created_hours + 0.1, $gravity) / main_info.replies) * 200;
    const $scored_lastpost = Math.trunc(timestamp - $base_score);
    return Math.min($scored_lastpost, timestamp);
  }

  return timestamp;
}
