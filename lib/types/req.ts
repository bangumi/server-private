import type { Static } from '@sinclair/typebox';
import { Type as t } from '@sinclair/typebox';

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

export const TurnstileToken = t.Object(
  {
    turnstileToken: t.String({ description: turnstileDescription }),
  },
  { $id: 'TurnstileToken' },
);

export type ICreateTopic = Static<typeof CreateTopic>;
export const CreateTopic = t.Object(
  {
    title: t.String({ minLength: 1 }),
    content: t.String({ minLength: 1, description: 'bbcode' }),
  },
  { $id: 'CreateTopic' },
);

export type IUpdateTopic = Static<typeof UpdateTopic>;
export const UpdateTopic = t.Object(
  {
    title: t.String({ minLength: 1 }),
    content: t.String({ minLength: 1, description: 'bbcode' }),
  },
  { $id: 'UpdateTopic' },
);

export type ICreateReply = Static<typeof CreateReply>;
export const CreateReply = t.Object(
  {
    content: t.String({ minLength: 1 }),
    replyTo: t.Optional(
      t.Integer({
        default: 0,
        description: '被回复的回复 ID, `0` 代表发送顶层回复',
      }),
    ),
  },
  { $id: 'CreateReply' },
);

export type ICreateContent = Static<typeof CreateContent>;
export const CreateContent = t.Object(
  {
    content: t.String({ minLength: 1 }),
  },
  { $id: 'CreateContent' },
);

export type IUpdateContent = Static<typeof UpdateContent>;
export const UpdateContent = t.Object(
  {
    content: t.String({ minLength: 1 }),
  },
  { $id: 'UpdateContent' },
);

export const EpisodeExpected = t.Optional(
  t.Partial(
    t.Object(
      {
        name: t.String(),
        nameCN: t.String(),
        duration: t.String(),
        date: t.String(),
        summary: t.String(),
      },
      {
        description:
          "a optional object to check if input is changed by others\nif some key is given, and current data in database doesn't match input, subject will not be changed",
      },
    ),
  ),
);
