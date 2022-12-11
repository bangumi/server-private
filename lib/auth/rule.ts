import type { IReply } from '../orm';
import type { IAuth } from './index';

export enum TopicDisplay {
  Ban = 0,
  Normal = 1,
  Review = 2,
}

export enum ReplyState {
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

export const rule = {
  ListTopicDisplays(u: IAuth): TopicDisplay[] {
    if (!u.login) {
      return [TopicDisplay.Normal];
    }

    if (u.permission.manage_topic_state) {
      return [TopicDisplay.Ban, TopicDisplay.Normal, TopicDisplay.Review];
    }

    return [TopicDisplay.Normal];
  },

  filterReply(x: IReply): IReply {
    return { ...filterReply(x), replies: x.replies.map((x) => filterReply(x)) };
  },
};

function filterReply<T extends { state: number; text: string }>(x: T): T {
  if (
    x.state === ReplyState.AdminDelete ||
    x.state === ReplyState.UserDelete ||
    x.state === ReplyState.AdminReopen ||
    x.state === ReplyState.AdminCloseTopic ||
    x.state === ReplyState.AdminSilentTopic
  ) {
    return { ...x, text: '' };
  }

  return x;
}
