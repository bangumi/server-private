import type { IAuth } from './index';

export enum TopicDisplay {
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
};
