export enum TimelineSource {
  Web = 0,
  Mobile = 1,
  OnAir = 2,
  InTouch = 3,
  WP = 4,
  API = 5,
  Next = 6,
}

/** 时间线分类 */
export enum TimelineCat {
  /**
   * 日常行为
   *
   * 0 = 神秘的行动, 1 = 注册, 2 = 添加好友, 3 = 加入小组, 4 = 创建小组, 5 = 加入乐园,
   */
  Daily = 1,

  /**
   * 维基操作
   *
   * 1 = 添加了新书, 2 = 添加了新动画, 3 = 添加了新唱片, 4 = 添加了新游戏, 5 = 添加了新图书系列, 6 = 添加了新影视,
   */
  Wiki = 2,

  /**
   * 收藏条目
   *
   * Single: 1 = 想读, 2 = 想看, 3 = 想听, 4 = 想玩, 5 = 读过, 6 = 看过, 7 = 听过, 8 = 玩过, 9 = 在读, 10 = 在看, 11 =
   * 在听, 12 = 在玩, 13 = 搁置了, 14 = 抛弃了,
   *
   * Batch: 1 = 本书, 2 = 部番组, 3 = 张音乐, 4 = 部游戏, 5 = 本书, 6 = 部番组, 7 = 张音乐, 8 = 部游戏, 9 = 本书, 10 = 部番组,
   * 11 = 张音乐, 12 = 部游戏,
   */
  Subject = 3,

  /**
   * 收视进度
   *
   * 0 = batch(完成), 1 = 想看, 2 = 看过, 3 = 抛弃,
   */
  Progress = 4,

  /**
   * 状态
   *
   * 0 = 更新签名, 1 = 吐槽, 2 = 修改昵称,
   */
  Status = 5,

  /** 日志 */
  Blog = 6,

  /** 目录 */
  Index = 7,

  /**
   * 人物
   *
   * Cat: 1 = 角色, 2 = 人物
   */
  Mono = 8,

  /**
   * 天窗
   *
   * 0 = 添加作品, 1 = 收藏作品, 2 = 创建社团, 3 = 关注社团, 4 = 关注活动, 5 = 参加活动
   */
  Doujin = 9,
}

/** 时间线 `cat = TimelineCat.Daily` 时的 `type` */
export enum TimelineDailyType {
  /** 神秘的行动 */
  Mystery = 0,

  /** 注册 */
  Register = 1,

  /** 添加好友 */
  AddFriend = 2,

  /** 加入小组 */
  JoinGroup = 3,

  /** 创建小组 */
  CreateGroup = 4,

  /** 加入乐园 */
  JoinEden = 5,
}

/** 时间线 `cat = TimelineCat.status` 时的 `type` */
export enum TimelineStatusType {
  /** 更新签名 */
  Sign = 0,

  /** 吐槽 */
  Tsukkomi = 1,

  /** 修改昵称 */
  Nickname = 2,
}

/** 时间线 `cat = TimelineCat.Mono` 时的 `type` */
export enum TimelineMonoType {
  /** 创建 */
  Created = 0,

  /** 收藏 */
  Collected = 1,
}

/** 时间线 `cat = TimelineCat.Mono` 时 memo 里的 `cat` */
export enum TimelineMonoCat {
  /** 角色 */
  Character = 1,

  /** 人物 */
  Person = 2,
}
