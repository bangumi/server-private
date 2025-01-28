import { CommentState } from './type.ts';

export function postCanReply(state: CommentState) {
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
