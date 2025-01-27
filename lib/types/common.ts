import type { Static, TRefUnsafe, TSchema, UnsafeOptions } from '@sinclair/typebox';
import { Type as t } from '@sinclair/typebox';

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

export const IndexRelatedCategory = t.Integer({
  $id: 'IndexRelatedCategory',
  enum: [0, 1, 2, 3],
  'x-ms-enum': {
    name: 'IndexRelatedCategory',
    modelAsString: false,
  },
  'x-enum-varnames': ['Subject', 'Character', 'Person', 'Episode'],
  description: `目录关联类型
  - 0 = 条目
  - 1 = 角色
  - 2 = 人物
  - 3 = 剧集`,
});
