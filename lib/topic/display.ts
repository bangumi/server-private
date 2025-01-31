import { DateTime } from 'luxon';

import type { IAuth } from '@app/lib/auth/index.ts';
import { CommentState, TopicDisplay } from '@app/lib/topic/type.ts';

export const CanViewStateClosedTopic = 24 * 60 * 60 * 180;
export const CanViewStateDeleteTopic = 24 * 60 * 60 * 365;

/** 在帖子列表能看到哪些状态的帖子。 */
export function ListTopicDisplays(u: IAuth): TopicDisplay[] {
  if (!u.login) {
    return [TopicDisplay.Normal];
  }

  if (u.permission.manage_topic_state || u.permission.ban_post) {
    return [TopicDisplay.Ban, TopicDisplay.Normal, TopicDisplay.Review];
  }

  return [TopicDisplay.Normal];
}

export function CanViewTopicContent(
  u: IAuth,
  state: number,
  display: number,
  creatorID: number,
): boolean {
  if (!u.login) {
    // 未登录用户只能看到正常帖子
    return (
      display === TopicDisplay.Normal &&
      (state === CommentState.Normal || state == CommentState.AdminReopen)
    );
  }

  // 登录用户

  // 管理员啥都能看
  if (u.permission.manage_topic_state || u.permission.ban_post) {
    return true;
  }

  if (u.userID == creatorID && display == TopicDisplay.Review) {
    return true;
  }

  // 非管理员看不到删除和review的帖子
  if (display != TopicDisplay.Normal) {
    return false;
  }

  // 注册时间决定
  if (state === CommentState.AdminCloseTopic) {
    return CanViewClosedTopic(u);
  }

  if (state === CommentState.AdminDelete) {
    return false;
  }

  if (state === CommentState.UserDelete) {
    return CanViewDeleteTopic(u);
  }

  return (
    state === CommentState.Normal ||
    state === CommentState.AdminReopen ||
    state === CommentState.AdminMerge ||
    state === CommentState.AdminPin ||
    state === CommentState.AdminSilentTopic
  );
}

function CanViewDeleteTopic(a: IAuth): boolean {
  return DateTime.now().toUnixInteger() - a.regTime > CanViewStateDeleteTopic;
}

function CanViewClosedTopic(a: IAuth): boolean {
  return DateTime.now().toUnixInteger() - a.regTime > CanViewStateClosedTopic;
}

export function CanViewTopicReply(state: number): boolean {
  switch (state) {
    case CommentState.AdminDelete:
    case CommentState.UserDelete:
    case CommentState.AdminReopen:
    case CommentState.AdminCloseTopic:
    case CommentState.AdminSilentTopic: {
      return false;
    }

    default: {
      return true;
    }
  }
}
