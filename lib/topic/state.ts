import { CommentState } from './type.ts';

export function canReplyPost(state: CommentState) {
  switch (state) {
    // 管理员操作记录不能回复
    case CommentState.AdminCloseTopic:
    case CommentState.AdminReopen:
    case CommentState.AdminSilentTopic: {
      return false;
    }
    default: {
      return true;
    }
  }
}

export function canEditTopic(state: CommentState) {
  switch (state) {
    case CommentState.AdminReopen:
    case CommentState.AdminPin:
    case CommentState.Normal: {
      return true;
    }
    default: {
      return false;
    }
  }
}
