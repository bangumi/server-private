import type { Static, TRefUnsafe, TSchema, UnsafeOptions } from '@sinclair/typebox';
import { Type as t } from '@sinclair/typebox';

import { datePattern } from '@app/lib/utils/date.ts';

export function Ref<T extends TSchema>(T: T, options?: UnsafeOptions): TRefUnsafe<T> {
  return t.Unsafe<Static<T>>({ $ref: T.$id, ...options });
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

export const EpisodeCollectionStatus = t.Integer({
  $id: 'EpisodeCollectionStatus',
  enum: [0, 1, 2, 3],
  'x-ms-enum': {
    name: 'EpisodeCollectionStatus',
    modelAsString: false,
  },
  'x-enum-varnames': ['None', 'Wish', 'Done', 'Dropped'],
  description: `剧集收藏状态
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
