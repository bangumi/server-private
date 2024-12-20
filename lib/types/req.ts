import type { Static } from '@sinclair/typebox';
import { Type as t } from '@sinclair/typebox';

import * as examples from '@app/lib/types/examples.ts';

const turnstileDescription = `需要 [turnstile](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/)
next.bgm.tv 域名对应的 site-key 为 \`0x4AAAAAAABkMYinukE8nzYS\`
dev.bgm38.com 域名使用测试用的 site-key \`1x00000000000000000000AA\``;

export type ICreateTopic = Static<typeof CreateTopic>;
export const CreateTopic = t.Object(
  {
    title: t.String({ minLength: 1 }),
    text: t.String({ minLength: 1, description: 'bbcode' }),
    'cf-turnstile-response': t.String({ description: turnstileDescription }),
  },
  {
    $id: 'CreateTopic',
    examples: [examples.createTopic],
  },
);

export type IUpdateTopic = Static<typeof UpdateTopic>;
export const UpdateTopic = t.Object(
  {
    title: t.String({ minLength: 1 }),
    text: t.String({ minLength: 1, description: 'bbcode' }),
  },
  { $id: 'UpdateTopic' },
);

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

export const SubjectSort = t.String({
  $id: 'SubjectSort',
  enum: ['rank', 'trends', 'collects', 'date', 'title'],
  default: 'rank',
  'x-ms-enum': {
    name: 'SubjectSort',
    modelAsString: true,
  },
  'x-enum-varnames': ['Rank', 'Trends', 'Collects', 'Date', 'Title'],
  description: `条目排序方式
  - rank = 排名
  - trends = 热度
  - collects = 收藏数
  - date = 发布日期
  - title = 标题`,
});
