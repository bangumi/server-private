import type { Static, TSchema, TSchemaOptions, TUnsafe } from 'typebox';
import t from 'typebox';
import { Unsafe } from 'typebox';

import { datePattern } from '@app/lib/utils/date.ts';

export function Ref<T extends TSchema>(t: T, options: TSchemaOptions = {}): TUnsafe<Static<T>> {
  const id = (t as unknown as Record<string, string | undefined>).$id;
  if (!id) {
    throw new Error('missing ID on schema');
  }
  return Unsafe<Static<T>>({ ...t, $ref: id, $id: undefined, ...options });
}

export const SubjectType = t.Integer({
  $id: 'SubjectType',
  enum: [1, 2, 3, 4, 6],
  'x-ms-enum': {
    name: 'SubjectType',
    modelAsString: false,
  },
  'x-enum-varnames': ['Book', 'Anime', 'Music', 'Game', 'Real'],
  description: `条目类型
  - 1 = 书籍
  - 2 = 动画
  - 3 = 音乐
  - 4 = 游戏
  - 6 = 三次元

  没有 5`,
});

export const PersonType = t.Integer({
  $id: 'PersonType',
  enum: [1, 2, 3],
  'x-ms-enum': {
    name: 'PersonType',
    modelAsString: false,
  },
  'x-enum-varnames': ['Individual', 'Company', 'Group'],
  description: `人物类型
  - 1 = 个人
  - 2 = 公司
  - 3 = 组合`,
});

export const CharacterType = t.Integer({
  $id: 'CharacterType',
  enum: [1, 2, 3, 4 /* , 5, 6, 7, 8, 9 */],
  'x-ms-enum': {
    name: 'CharacterType',
    modelAsString: false,
  },
  'x-enum-varnames': [
    'Crt',
    'Mecha',
    'Vessel',
    'Org' /* , 'Weapon', 'Armor', 'Item', 'Spell', 'Vidol' */,
  ],
  description: `角色类型
  - 1 = 角色
  - 2 = 机体
  - 3 = 舰船
  - 4 = 组织机构`,
  /* - 5 = 兵器
  - 6 = 装备
  - 7 = 道具&物品
  - 8 = 技能&法术
  - 9 = 虚拟偶像`*/
});

export const CharacterCastType = t.Integer({
  $id: 'CharacterCastType',
  enum: [0, 2, 1, 3, 4, 5, 6],
  'x-ms-enum': {
    name: 'CharacterCastType',
    modelAsString: false,
  },
  'x-enum-varnames': ['CV', 'Actor', 'Dub', 'ChineseDub', 'JapaneseDub', 'EnglishDub', 'KoreanDub'],
  description: `Character cast relation type
  - 0 = CV
  - 1 = Dub
  - 2 = Actor
  - 3 = Chinese dub
  - 4 = Japanese dub
  - 5 = English dub
  - 6 = Korean dub`,
});

export const EpisodeType = t.Integer({
  $id: 'EpisodeType',
  enum: [0, 1, 2, 3, 4, 5, 6],
  'x-ms-enum': {
    name: 'EpisodeType',
    modelAsString: false,
  },
  'x-enum-varnames': ['Normal', 'Special', 'OP', 'ED', 'Pre', 'MAD', 'Other'],
  description: `话数类型
  - 0 = 本篇
  - 1 = 特别篇
  - 2 = OP
  - 3 = ED
  - 4 = 预告/宣传/广告
  - 5 = MAD
  - 6 = 其他`,
});

export const CollectionType = t.Integer({
  $id: 'CollectionType',
  enum: [1, 2, 3, 4, 5],
  'x-ms-enum': {
    name: 'CollectionType',
    modelAsString: false,
  },
  'x-enum-varnames': ['Wish', 'Collect', 'Doing', 'OnHold', 'Dropped'],
  description: `条目收藏状态
  - 1 = 想看
  - 2 = 看过
  - 3 = 在看
  - 4 = 搁置
  - 5 = 抛弃`,
});

export const IndexRelatedCategory = t.Integer({
  $id: 'IndexRelatedCategory',
  enum: [0, 1, 2, 3, 4, 5, 6],
  'x-ms-enum': {
    name: 'IndexRelatedCategory',
    modelAsString: false,
  },
  'x-enum-varnames': [
    'Subject',
    'Character',
    'Person',
    'Episode',
    'Blog',
    'GroupTopic',
    'SubjectTopic',
  ],
  description: `目录关联类型
  - 0 = 条目
  - 1 = 角色
  - 2 = 人物
  - 3 = 章节
  - 4 = 日志
  - 5 = 小组话题
  - 6 = 条目讨论`,
});

export const EpisodeCollectionStatus = t.Integer({
  $id: 'EpisodeCollectionStatus',
  enum: [0, 1, 2, 3],
  'x-ms-enum': {
    name: 'EpisodeCollectionStatus',
    modelAsString: false,
  },
  'x-enum-varnames': ['None', 'Wish', 'Done', 'Dropped'],
  description: `章节收藏状态
  - 0 = 撤消/删除
  - 1 = 想看
  - 2 = 看过
  - 3 = 抛弃`,
});

export const GroupMemberRole = t.Integer({
  $id: 'GroupMemberRole',
  enum: [-2, -1, 0, 1, 2, 3],
  'x-ms-enum': {
    name: 'GroupMemberRole',
    modelAsString: false,
  },
  'x-enum-varnames': ['Visitor', 'Guest', 'Member', 'Creator', 'Moderator', 'Blocked'],
  description: `小组成员角色
  - -2 = 访客
  - -1 = 游客
  - 0 = 小组成员
  - 1 = 小组长
  - 2 = 小组管理员
  - 3 = 禁言成员`,
});

export const IndexType = t.Integer({
  $id: 'IndexType',
  enum: [0, 1, 2],
  'x-ms-enum': {
    name: 'IndexType',
    modelAsString: false,
  },
  'x-enum-varnames': ['User', 'Public', 'Award'],
  description: `目录类型
  - 0 = 用户
  - 1 = 公共
  - 2 = TBA`,
});

export type IEpisodeWikiInfo = Static<typeof EpisodeWikiInfo>;
export const EpisodeWikiInfo = t.Object(
  {
    id: t.Integer(),
    subjectID: t.Integer(),
    name: t.String(),
    nameCN: t.String(),
    type: Ref(EpisodeType),
    ep: t.Number(),
    disc: t.Optional(t.Number()),
    duration: t.String({ examples: ['24:53', '24m52s'] }),
    date: t.Optional(
      t.String({
        description: 'YYYY-MM-DD',
        pattern: datePattern.source,
        examples: ['2022-02-02'],
      }),
    ),
    summary: t.String(),
  },
  {
    $id: 'EpisodeWikiInfo',
  },
);

export const ReportReason = t.Integer({
  $id: 'ReportReason',
  enum: [1, 2, 3, 4, 5, 6, 7, 8, 9, 99],
  'x-ms-enum': {
    name: 'ReportReason',
    modelAsString: false,
  },
  'x-enum-varnames': [
    'Abuse',
    'Spam',
    'Political',
    'Illegal',
    'Privacy',
    'CheatScore',
    'Flame',
    'Advertisement',
    'Spoiler',
    'Other',
  ],
  description: `举报原因
  - 1 = 辱骂、人身攻击
  - 2 = 刷屏、无关内容
  - 3 = 政治相关
  - 4 = 违法信息
  - 5 = 泄露隐私
  - 6 = 涉嫌刷分
  - 7 = 引战
  - 8 = 广告
  - 9 = 剧透
  - 99 = 其他`,
});

export const ReportType = t.Integer({
  $id: 'ReportType',
  enum: [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
  'x-ms-enum': {
    name: 'ReportType',
    modelAsString: false,
  },
  'x-enum-varnames': [
    'User',
    'GroupTopic',
    'GroupReply',
    'SubjectTopic',
    'SubjectReply',
    'EpisodeReply',
    'CharacterReply',
    'PersonReply',
    'Blog',
    'BlogReply',
    'Timeline',
    'TimelineReply',
    'Index',
    'IndexReply',
  ],
  description: `举报类型
  - 6 = 用户
  - 7 = 小组话题
  - 8 = 小组回复
  - 9 = 条目话题
  - 10 = 条目回复
  - 11 = 章节回复
  - 12 = 角色回复
  - 13 = 人物回复
  - 14 = 日志
  - 15 = 日志回复
  - 16 = 时间线
  - 17 = 时间线回复
  - 18 = 目录
  - 19 = 目录回复`,
});

export const RevisionType = t.Integer({
  $id: 'RevisionType',
  enum: [
    1, 103, 104, 11, 12, 17, 5, 6, 10, 2, 13, 14, 4, 7, 3, 15, 16, 8, 9, 18, 181, 182, 183, 184,
    185,
  ],
  'x-ms-enum': {
    name: 'RevisionType',
    modelAsString: false,
  },
  'x-enum-varnames': [
    'SubjectEdit',
    'SubjectLock',
    'SubjectUnlock',
    'SubjectMerge',
    'SubjectErase',
    'SubjectRelation',
    'SubjectCharacterRelation',
    'SubjectCastRelation',
    'SubjectPersonRelation',
    'CharacterEdit',
    'CharacterMerge',
    'CharacterErase',
    'CharacterSubjectRelation',
    'CharacterCastRelation',
    'PersonEdit',
    'PersonMerge',
    'PersonErase',
    'PersonCastRelation',
    'PersonSubjectRelation',
    'EpisodeEdit',
    'EpisodeMerge',
    'EpisodeMove',
    'EpisodeLock',
    'EpisodeUnlock',
    'EpisodeErase',
  ],
  description: `修订类型
  - 1 = 条目编辑
  - 103 = 条目锁定
  - 104 = 条目解锁
  - 11 = 条目合体
  - 12 = 条目删除
  - 17 = 条目关联
  - 5 = 条目->角色关联
  - 6 = 条目->声优关联
  - 10 = 条目->人物关联

  - 2 = 角色编辑
  - 13 = 角色合体
  - 14 = 角色删除
  - 4 = 角色->条目关联
  - 7 = 角色->声优关联

  - 3 = 人物编辑
  - 15 = 人物合体
  - 16 = 人物删除
  - 8 = 人物->声优关联
  - 9 = 人物->条目关联

  - 18 = 章节编辑
  - 181 = 章节合体
  - 182 = 章节移动
  - 183 = 章节锁定
  - 184 = 章节解锁
  - 185 = 章节删除
`,
});

export const TimelineCat = t.Integer({
  $id: 'TimelineCat',
  enum: [1, 2, 3, 4, 5, 6, 7, 8, 9],
  'x-ms-enum': {
    name: 'TimelineCat',
    modelAsString: false,
  },
  'x-enum-varnames': [
    'Daily',
    'Wiki',
    'Subject',
    'Progress',
    'Status',
    'Blog',
    'Index',
    'Mono',
    'Doujin',
  ],
  description: `时间线类型
  - 1 = 日常行为
  - 2 = 维基操作
  - 3 = 收藏条目
  - 4 = 收视进度
  - 5 = 状态
  - 6 = 日志
  - 7 = 目录
  - 8 = 人物
  - 9 = 天窗`,
});

export const SubjectRelationId = t.Integer({
  $id: 'SubjectRelationId',
  enum: [
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 99, 1002, 1003, 1004, 1005, 1006, 1007, 1008, 1010,
    1011, 1012, 1013, 1014, 1015, 1099, 3001, 3002, 3003, 3004, 3005, 3006, 3007, 3099, 4002, 4003,
    4006, 4007, 4008, 4009, 4010, 4012, 4014, 4015, 4016, 4017, 4018, 4019, 4099,
  ],
  'x-ms-enum': {
    name: 'SubjectRelationId',
    modelAsString: false,
  },
  'x-enum-varnames': [
    'ADAPTATION',
    'ANIME_PREQUEL',
    'ANIME_SEQUEL',
    'ANIME_SUMMARY',
    'ANIME_FULL_STORY',
    'ANIME_SIDE_STORY',
    'ANIME_CHARACTER',
    'ANIME_SAME_SETTING',
    'ANIME_ALTERNATIVE_SETTING',
    'ANIME_ALTERNATIVE_VERSION',
    'ANIME_SPIN_OFF',
    'ANIME_PARENT_STORY',
    'ANIME_COLLABORATION',
    'ANIME_OTHER',
    'BOOK_SERIES',
    'BOOK_OFFPRINT',
    'BOOK_ALBUM',
    'BOOK_PREQUEL',
    'BOOK_SEQUEL',
    'BOOK_SIDE_STORY',
    'BOOK_PARENT_STORY',
    'BOOK_VERSION',
    'BOOK_CHARACTER',
    'BOOK_SAME_SETTING',
    'BOOK_ALTERNATIVE_SETTING',
    'BOOK_COLLABORATION',
    'BOOK_ALTERNATIVE_VERSION',
    'BOOK_OTHER',
    'MUSIC_OST',
    'MUSIC_CHARACTER_SONG',
    'MUSIC_OPENING_SONG',
    'MUSIC_ENDING_SONG',
    'MUSIC_INSERT_SONG',
    'MUSIC_IMAGE_SONG',
    'MUSIC_DRAMA',
    'MUSIC_OTHER',
    'GAME_PREQUEL',
    'GAME_SEQUEL',
    'GAME_SIDE_STORY',
    'GAME_CHARACTER',
    'GAME_SAME_SETTING',
    'GAME_ALTERNATIVE_SETTING',
    'GAME_ALTERNATIVE_VERSION',
    'GAME_PARENT_STORY',
    'GAME_COLLABORATION',
    'GAME_DLC',
    'GAME_VERSION',
    'GAME_MAIN_VERSION',
    'GAME_COLLECTION',
    'GAME_IN_COLLECTION',
    'GAME_OTHER',
  ],
  description: `关系类型
  - 1 = ADAPTATION (通用-改编)
  - 2 = ANIME_PREQUEL (动画-前传)
  - 3 = ANIME_SEQUEL (动画-续集)
  - 4 = ANIME_SUMMARY (动画-总集篇)
  - 5 = ANIME_FULL_STORY (动画-完整故事)
  - 6 = ANIME_SIDE_STORY (动画-番外篇)
  - 7 = ANIME_CHARACTER (动画-角色)
  - 8 = ANIME_SAME_SETTING (动画-相同背景)
  - 9 = ANIME_ALTERNATIVE_SETTING (动画-不同设定)
  - 10 = ANIME_ALTERNATIVE_VERSION (动画-不同版本)
  - 11 = ANIME_SPIN_OFF (动画-衍生)
  - 12 = ANIME_PARENT_STORY (动画-原作)
  - 14 = ANIME_COLLABORATION (动画-合作)
  - 99 = ANIME_OTHER (动画-其他)
  - 1002 = BOOK_SERIES (书籍-系列)
  - 1003 = BOOK_OFFPRINT (书籍-单行本)
  - 1004 = BOOK_ALBUM (书籍-画集)
  - 1005 = BOOK_PREQUEL (书籍-前传)
  - 1006 = BOOK_SEQUEL (书籍-续集)
  - 1007 = BOOK_SIDE_STORY (书籍-番外)
  - 1008 = BOOK_PARENT_STORY (书籍-原作)
  - 1010 = BOOK_VERSION (书籍-版本)
  - 1011 = BOOK_CHARACTER (书籍-角色)
  - 1012 = BOOK_SAME_SETTING (书籍-相同背景)
  - 1013 = BOOK_ALTERNATIVE_SETTING (书籍-不同设定)
  - 1014 = BOOK_COLLABORATION (书籍-合作)
  - 1015 = BOOK_ALTERNATIVE_VERSION (书籍-不同版本)
  - 1099 = BOOK_OTHER (书籍-其他)
  - 3001 = MUSIC_OST (音乐-原声)
  - 3002 = MUSIC_CHARACTER_SONG (音乐-角色歌)
  - 3003 = MUSIC_OPENING_SONG (音乐-片头曲)
  - 3004 = MUSIC_ENDING_SONG (音乐-片尾曲)
  - 3005 = MUSIC_INSERT_SONG (音乐-插入曲)
  - 3006 = MUSIC_IMAGE_SONG (音乐-印象曲)
  - 3007 = MUSIC_DRAMA (音乐-广播剧)
  - 3099 = MUSIC_OTHER (音乐-其他)
  - 4002 = GAME_PREQUEL (游戏-前传)
  - 4003 = GAME_SEQUEL (游戏-续集)
  - 4006 = GAME_SIDE_STORY (游戏-番外)
  - 4007 = GAME_CHARACTER (游戏-角色)
  - 4008 = GAME_SAME_SETTING (游戏-相同背景)
  - 4009 = GAME_ALTERNATIVE_SETTING (游戏-不同设定)
  - 4010 = GAME_ALTERNATIVE_VERSION (游戏-不同版本)
  - 4012 = GAME_PARENT_STORY (游戏-原作)
  - 4014 = GAME_COLLABORATION (游戏-合作)
  - 4015 = GAME_DLC (游戏-DLC)
  - 4016 = GAME_VERSION (游戏-版本)
  - 4017 = GAME_MAIN_VERSION (游戏-主流版本)
  - 4018 = GAME_COLLECTION (游戏-合集)
  - 4019 = GAME_IN_COLLECTION (游戏-被合集)
  - 4099 = GAME_OTHER (游戏-其他)`,
});

export const PersonProfessions = t.Object({
  producer: t.Optional(t.Boolean()),
  mangaka: t.Optional(t.Boolean()),
  artist: t.Optional(t.Boolean()),
  seiyu: t.Optional(t.Boolean()),
  writer: t.Optional(t.Boolean()),
  illustrator: t.Optional(t.Boolean()),
  actor: t.Optional(t.Boolean()),
});
