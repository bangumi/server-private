import { DateTime } from 'luxon';

import type { IAuth } from '@app/lib/auth/index.ts';
import type { IReply } from '@app/lib/topic/index.ts';
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
  topic: { state: number; display: number; creatorID: number },
): boolean {
  if (!u.login) {
    // 未登录用户只能看到正常帖子
    return (
      topic.display === TopicDisplay.Normal &&
      (topic.state === CommentState.Normal || topic.state == CommentState.AdminReopen)
    );
  }

  // 登录用户

  // 管理员啥都能看
  if (u.permission.manage_topic_state || u.permission.ban_post) {
    return true;
  }

  if (u.userID == topic.creatorID && topic.display == TopicDisplay.Review) {
    return true;
  }

  // 非管理员看不到删除和review的帖子
  if (topic.display != TopicDisplay.Normal) {
    return false;
  }

  // 注册时间决定
  if (topic.state === CommentState.AdminCloseTopic) {
    return CanViewClosedTopic(u);
  }

  if (topic.state === CommentState.AdminDelete) {
    return false;
  }

  if (topic.state === CommentState.UserDelete) {
    return CanViewDeleteTopic(u);
  }

  return (
    topic.state === CommentState.Normal ||
    topic.state === CommentState.AdminReopen ||
    topic.state === CommentState.AdminMerge ||
    topic.state === CommentState.AdminPin ||
    topic.state === CommentState.AdminSilentTopic
  );
}

function CanViewDeleteTopic(a: IAuth): boolean {
  return DateTime.now().toUnixInteger() - a.regTime > CanViewStateDeleteTopic;
}

function CanViewClosedTopic(a: IAuth): boolean {
  return DateTime.now().toUnixInteger() - a.regTime > CanViewStateClosedTopic;
}

export function filterReply(x: IReply): IReply {
  return {
    ...filterSubReply(x),
    replies: x.replies.map((x) => filterSubReply(x)),
  };
}

function filterSubReply<T extends { state: number; text: string }>(x: T): T {
  if (
    x.state === CommentState.AdminDelete ||
    x.state === CommentState.UserDelete ||
    x.state === CommentState.AdminReopen ||
    x.state === CommentState.AdminCloseTopic ||
    x.state === CommentState.AdminSilentTopic
  ) {
    return { ...x, text: '' };
  }

  return x;
}
