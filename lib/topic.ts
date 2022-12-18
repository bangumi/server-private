import { createError } from '@fastify/error';
import dayjs from 'dayjs';

import { NotAllowedError } from './auth';
import { NotFoundError, UnimplementedError } from './errors';
import * as Notify from './notify';
import type { IUser } from './orm';
import * as orm from './orm';
import { fetchUserX } from './orm';
import { AppDataSource, GroupPostRepo, GroupRepo } from './torm';
import * as entity from './torm/entity';

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
    topicID: p.mid,
    content: p.content,
  };
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
  replyTo,
  content,
  state = ReplyState.Normal,
}: {
  topicType: Type;
  topicID: number;
  userID: number;
  content: string;
  replyTo: number;
  state?: ReplyState;
}): Promise<IPost> {
  const now = dayjs();
  if (topicType === Type.group) {
    const p = await AppDataSource.transaction(async (t) => {
      const GroupPostRepo = t.getRepository(entity.GroupPost);
      const GroupTopicRepo = t.getRepository(entity.GroupTopic);
      const topic = await GroupTopicRepo.findOne({ where: { id: topicID } });

      if (!topic) {
        throw new NotFoundError(`group topic ${topicID}`);
      }

      if (topic.state === ReplyState.AdminCloseTopic) {
        throw new NotAllowedError('reply to a closed topic');
      }

      const group = await GroupRepo.findOneOrFail({
        where: { id: topic.gid },
      });

      if (!group.accessible && !(await orm.isMemberInGroup(group.id, userID))) {
        throw new NotJoinPrivateGroupError(group.name);
      }

      let parentID = 0;
      let dstUserID = topic.uid;
      if (replyTo !== 0) {
        const replied = await GroupPostRepo.findOne({ where: { id: replyTo, mid: topic.id } });
        if (!replied || replied.mid !== topic.id) {
          throw new NotFoundError(`topic ${replyTo} in ${topic.id}`);
        }

        dstUserID = replied.uid;
        parentID = replied.related || replied.id;
      }

      // 创建回帖
      const post = await GroupPostRepo.save({
        mid: topicID,
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
        topicUpdate.dateline = scopeUpdateTime(now.unix(), topicType, topic);
      }

      await GroupTopicRepo.update({ id: topic.id }, topicUpdate);

      // 发送通知
      if (dstUserID !== userID) {
        const notifyType = replyTo === 0 ? Notify.Type.GroupTopicReply : Notify.Type.GroupPostReply;
        await Notify.create(t, {
          destUserID: dstUserID,
          sourceUserID: userID,
          now,
          type: notifyType,
          postID: post.id,
          topicID: topic.id,
          title: topic.title,
        });
      }

      return post;
    });

    return {
      id: p.id,
      type: Type.group,
      user: await fetchUserX(p.uid),
      createdAt: p.dateline,
      state: p.state,
      topicID: p.mid,
      content: p.content,
    };
  }

  throw new UnimplementedError('creating group reply');
}

function scopeUpdateTime(timestamp: number, type: Type, main_info: entity.GroupTopic): number {
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
