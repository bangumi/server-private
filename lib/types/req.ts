import type { Static } from '@sinclair/typebox';
import { Type as t } from '@sinclair/typebox';

import { CollectionType, Ref } from '@app/lib/types/common.ts';
import * as examples from '@app/lib/types/examples.ts';

export * from '@app/lib/types/common.ts';

const turnstileDescription = `需要 [turnstile](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/)
next.bgm.tv 域名对应的 site-key 为 \`0x4AAAAAAABkMYinukE8nzYS\`
dev.bgm38.tv 域名使用测试用的 site-key \`1x00000000000000000000AA\``;

export const FilterMode = t.String({
  $id: 'FilterMode',
  enum: ['all', 'friends'],
  'x-ms-enum': {
    name: 'FilterMode',
    modelAsString: true,
  },
  'x-enum-varnames': ['All', 'Friends'],
  description: `过滤模式
  - all = 全站
  - friends = 好友`,
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

export type ICreateTopic = Static<typeof CreateTopic>;
export const CreateTopic = t.Object(
  {
    title: t.String({ minLength: 1 }),
    content: t.String({ minLength: 1, description: 'bbcode' }),
    turnstileToken: t.String({ description: turnstileDescription }),
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
    content: t.String({ minLength: 1, description: 'bbcode' }),
  },
  { $id: 'UpdateTopic' },
);

export type ICreatePost = Static<typeof CreatePost>;
export const CreatePost = t.Object(
  {
    content: t.String({ minLength: 1 }),
    replyTo: t.Optional(
      t.Integer({
        default: 0,
        description: '被回复的帖子 ID, `0` 代表回复楼主',
      }),
    ),
    turnstileToken: t.String({ minLength: 1, description: turnstileDescription }),
  },
  { $id: 'CreatePost' },
);

export type IUpdatePost = Static<typeof UpdatePost>;
export const UpdatePost = t.Object(
  {
    content: t.String({ minLength: 1, description: 'bbcode' }),
  },
  { $id: 'UpdatePost' },
);

export type ICreateEpisodeComment = Static<typeof CreateEpisodeComment>;
export const CreateEpisodeComment = t.Object(
  {
    content: t.String({ minLength: 1 }),
    replyTo: t.Optional(
      t.Integer({
        default: 0,
        description: '被回复的吐槽 ID, `0` 代表发送顶层吐槽',
      }),
    ),
    turnstileToken: t.String({ minLength: 1, description: turnstileDescription }),
  },
  { $id: 'CreateEpisodeComment' },
);

export type IUpdateEpisodeComment = Static<typeof UpdateEpisodeComment>;
export const UpdateEpisodeComment = t.Object(
  {
    content: t.String({ minLength: 1 }),
  },
  { $id: 'UpdateEpisodeComment' },
);

export type ICollectSubject = Static<typeof CollectSubject>;
export const CollectSubject = t.Object({
  type: t.Optional(Ref(CollectionType)),
  rate: t.Optional(t.Integer({ minimum: 0, maximum: 10, description: '评分，0 表示删除评分' })),
  epStatus: t.Optional(t.Integer({ minimum: 0, description: '书籍条目章节进度' })),
  volStatus: t.Optional(t.Integer({ minimum: 0, description: '书籍条目卷数进度' })),
  comment: t.Optional(t.String({ description: '评价' })),
  priv: t.Optional(t.Boolean({ description: '仅自己可见' })),
  tags: t.Optional(t.Array(t.String({ description: '标签, 不能包含空格' }))),
});

export type ICreateTimelineSay = Static<typeof CreateTimelineSay>;
export const CreateTimelineSay = t.Object(
  {
    content: t.String({ minLength: 1 }),
    turnstileToken: t.String({ minLength: 1, description: turnstileDescription }),
  },
  { $id: 'CreateTimelineSay' },
);
