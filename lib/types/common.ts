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
