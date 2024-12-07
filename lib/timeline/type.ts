export enum TimelineSource {
  Web = 0,
  Mobile = 1,
  OnAir = 2,
  InTouch = 3,
  WP = 4,
  API = 5,
}

export enum TimelineMode {
  All = 'all',
  Friends = 'friends',
}

export enum TimelineCat {
  Daily = 1, // 日常行为: 注册, 添加好友, 加入小组, 创建小组, 加入乐园
  Wiki = 2, // 维基操作
  Subject = 3, // 收藏条目
  Progress = 4, // 收视进度
  Status = 5, // 吐槽
  Blog = 6, // 日志
  Index = 7, // 目录
  Mono = 8, // 人物
  Doujin = 9, // 天窗: 添加作品, 收藏作品, 创建社团, 关注社团, 关注活动, 参加活动
}

// $source_text = array(
//   'subject' => array(1 => '想读', 2 => '想看', 3 => '想听', 4 => '想玩', 5 => '读过', 6 => '看过', 7 => '听过', 8 => '玩过', 9 => '在读', 10 => '在看', 11 => '在听', 12 => '在玩', 13 => '搁置了', 14 => '抛弃了'),
//   'subject_batch' => array(1 => '本书', 2 => '部番组', 3 => '张音乐', 4 => '部游戏', 5 => '本书', 6 => '部番组', 7 => '张音乐', 8 => '部游戏', 9 => '本书', 10 => '部番组', 11 => '张音乐', 12 => '部游戏',),
//   'new_subject' => array(1 => '添加了新书', 2 => '添加了新动画', 3 => '添加了新唱片', 4 => '添加了新游戏', 5 => '添加了新图书系列', 6 => '添加了新影视',),
// );
