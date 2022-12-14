import type { IReply } from '../orm';
import { ReplyState } from '../topic';
import type { IAuth } from './index';

export const enum TopicDisplay {
  Ban = 0,
  Normal = 1,
  Review = 2,
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
