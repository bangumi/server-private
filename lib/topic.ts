import dayjs from 'dayjs';

import { UnimplementedError } from './errors';
import type { IUser } from './orm';
import { fetchUserX } from './orm';
import prisma from './prisma';

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
  const p = await prisma.groupPosts.findFirst({
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

export async function createTopicReply({
  topicID,
  userID,
  relatedID = 0,
  content,
  state = ReplyState.Normal,
}: {
  topicID: number;
  userID: number;
  content: string;
  relatedID?: number;
  state?: ReplyState;
}): Promise<IPost> {
  const p = await prisma.groupPosts.create({
    data: {
      mid: topicID,
      content,
      uid: userID,
      related: relatedID,
      state,
      dateline: dayjs().unix(),
    },
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
