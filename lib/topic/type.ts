export const enum CommentState {
  Normal = 0, // 正常
  // CommentStateAdminCloseTopic 管理员关闭主题 https://bgm.tv/subject/topic/12629#post_108127
  AdminCloseTopic = 1, // 关闭
  AdminReopen = 2, // 重开
  AdminPin = 3, // 置顶
  AdminMerge = 4, // 合并
  // CommentStateAdminSilentTopic 管理员下沉 https://bgm.tv/subject/topic/18784#post_160402
  AdminSilentTopic = 5, // 下沉
  UserDelete = 6, // 自行删除
  AdminDelete = 7, // 管理员删除
  AdminOffTopic = 8, // 折叠
}

export const TopicDisplay = Object.freeze({
  Ban: 0, // 软删除
  Normal: 1,
  Review: 2,
});

export type TopicDisplay = (typeof TopicDisplay)[keyof typeof TopicDisplay];
