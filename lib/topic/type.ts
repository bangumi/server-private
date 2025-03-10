export type CommentState = (typeof CommentState)[keyof typeof CommentState];
export const CommentState = Object.freeze({
  Normal: 0 as number, // 正常
  AdminCloseTopic: 1 as number, // CommentStateAdminCloseTopic 管理员关闭主题 https://bgm.tv/subject/topic/12629#post_108127
  AdminReopen: 2 as number, // 重开
  AdminPin: 3 as number, // 置顶
  AdminMerge: 4 as number, // 合并
  AdminSilentTopic: 5 as number, // CommentStateAdminSilentTopic 管理员下沉 https://bgm.tv/subject/topic/18784#post_160402
  UserDelete: 6 as number, // 自行删除
  AdminDelete: 7 as number, // 管理员删除
  AdminOffTopic: 8 as number, // 折叠
});

export const TopicDisplay = Object.freeze({
  Ban: 0, // 软删除
  Normal: 1,
  Review: 2,
});

export type TopicDisplay = (typeof TopicDisplay)[keyof typeof TopicDisplay];
