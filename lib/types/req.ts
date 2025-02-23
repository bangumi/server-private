import type { Static } from '@sinclair/typebox';
import { Type as t } from '@sinclair/typebox';

import {
  CollectionType,
  EpisodeCollectionStatus,
  Ref,
  SubjectType,
} from '@app/lib/types/common.ts';

export * from '@app/lib/types/common.ts';

const turnstileDescription = `需要 [turnstile](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/)
next.bgm.tv 域名对应的 site-key 为 \`0x4AAAAAAABkMYinukE8nzYS\`
dev.bgm38.tv 域名使用测试用的 site-key \`1x00000000000000000000AA\``;

const nsfwDescription = `无权限的用户会直接忽略此字段，不会返回 R18 条目。
\`null\` 或者 \`true\` 会返回包含 R18 的所有搜索结果。
\`false\` 只会返回非 R18 条目。`;

export const TimelineFilterMode = t.String({
  $id: 'TimelineFilterMode',
  enum: ['all', 'friends'],
  'x-ms-enum': {
    name: 'TimelineFilterMode',
    modelAsString: true,
  },
  'x-enum-varnames': ['All', 'Friends'],
  description: `时间线过滤模式
  - all = 全站
  - friends = 好友`,
});

export const GroupTopicFilterMode = t.String({
  $id: 'GroupTopicFilterMode',
  enum: ['all', 'joined', 'created', 'replied'],
  'x-ms-enum': {
    name: 'GroupTopicFilterMode',
    modelAsString: true,
  },
  'x-enum-varnames': ['All', 'Joined', 'Created', 'Replied'],
  description: `小组话题过滤模式
  - all = 全站
  - joined = 已加入
  - created = 我创建的
  - replied = 我回复的`,
});

export const GroupSort = t.String({
  $id: 'GroupSort',
  enum: ['posts', 'topics', 'members', 'created', 'updated'],
  default: 'created',
  description: `小组排序方式
  - posts = 帖子数
  - topics = 主题数
  - members = 成员数
  - created = 创建时间
  - updated = 最新讨论`,
});

export const SubjectBrowseSort = t.String({
  $id: 'SubjectBrowseSort',
  enum: ['rank', 'trends', 'collects', 'date', 'title'],
  default: 'rank',
  'x-ms-enum': {
    name: 'SubjectBrowseSort',
    modelAsString: true,
  },
  'x-enum-varnames': ['Rank', 'Trends', 'Collects', 'Date', 'Title'],
  description: `条目浏览排序方式
  - rank = 排名
  - trends = 热度
  - collects = 收藏数
  - date = 发布日期
  - title = 标题`,
});

export type ISubjectSearchSort = Static<typeof SubjectSearchSort>;
export const SubjectSearchSort = t.String({
  $id: 'SubjectSearchSort',
  enum: ['match', 'heat', 'rank', 'score'],
  default: 'match',
  'x-ms-enum': {
    name: 'SubjectSearchSort',
    modelAsString: true,
  },
  'x-enum-varnames': ['Match', 'Heat', 'Rank', 'Score'],
  description: `条目搜索排序方式
  - match = 匹配程度
  - heat = 收藏人数
  - rank = 排名由高到低
  - score = 评分`,
});

export type ISubjectSearchFilter = Static<typeof SubjectSearchFilter>;
export const SubjectSearchFilter = t.Object(
  {
    type: t.Optional(
      t.Array(
        Ref(SubjectType, {
          description: '条目类型, 可以多次出现。多值之间为 `或` 关系。',
          examples: [2],
        }),
      ),
    ),
    tags: t.Optional(
      t.Array(
        t.String({
          description: '标签，可以多次出现。多值之间为 `且` 关系。',
          examples: ['童年', '原创'],
        }),
      ),
    ),
    metaTags: t.Optional(
      t.Array(
        t.String({
          description:
            '公共标签。多个值之间为 `且` 关系。可以用 `-` 排除标签。比如 `-科幻` 可以排除科幻标签。',
          examples: ['童年', '原创'],
        }),
      ),
    ),
    date: t.Optional(
      t.Array(
        t.String({
          description: '播出日期/发售日期，日期必需为 YYYY-MM-DD 格式。多值之间为 `且` 关系。',
          examples: ['>=2020-07-01', '<2020-10-01'],
        }),
      ),
    ),
    rating: t.Optional(
      t.Array(
        t.String({
          description: '用于搜索指定评分的条目，多值之间为 `且` 关系。',
          examples: ['>=6', '<8'],
        }),
      ),
    ),
    rank: t.Optional(
      t.Array(
        t.String({
          description: '用于搜索指定排名的条目，多值之间为 `且` 关系。',
          examples: ['>10', '<=18'],
        }),
      ),
    ),
    nsfw: t.Optional(t.Boolean({ description: nsfwDescription })),
  },
  { $id: 'SubjectSearchFilter' },
);

export type ICharacterSearchFilter = Static<typeof CharacterSearchFilter>;
export const CharacterSearchFilter = t.Object(
  {
    nsfw: t.Optional(t.Boolean({ description: nsfwDescription })),
  },
  { $id: 'CharacterSearchFilter' },
);

export type IPersonSearchFilter = Static<typeof PersonSearchFilter>;
export const PersonSearchFilter = t.Object(
  {
    career: t.Optional(
      t.Array(
        t.String({
          description: `职业, 可以多次出现。多值之间为 \`且\` 关系，用 \`-\` 排除职业。
        支持的职业有：
        - producer: 制作人
        - mangaka: 漫画家
        - artist: 艺术家
        - illustrator: 插画家
        - seiyu: 声优
        - writer: 编剧
        - actor: 演员`,
          examples: ['seiyu', 'mangaka', '-illustrator'],
        }),
      ),
    ),
  },
  { $id: 'PersonSearchFilter' },
);

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

export type ICollectSubject = Static<typeof CollectSubject>;
export const CollectSubject = t.Object(
  {
    type: t.Optional(Ref(CollectionType)),
    rate: t.Optional(t.Integer({ minimum: 0, maximum: 10, description: '评分，0 表示删除评分' })),
    comment: t.Optional(t.String({ description: '评价' })),
    private: t.Optional(t.Boolean({ description: '仅自己可见' })),
    tags: t.Optional(t.Array(t.String({ description: '标签, 不能包含空格' }))),
    progress: t.Optional(
      t.Boolean({
        description: `是否自动完成条目进度，仅在 \`type\` 为 \`看过\` 时有效，并且不会产生对应的时间线记录：
          - 书籍条目会检查总的话数和卷数，并更新收藏进度到最新;
          - 动画和三次元会标记所有正片章节为已完成，并同时更新收藏进度`,
      }),
    ),
  },
  { $id: 'CollectSubject' },
);

export type IUpdateSubjectProgress = Static<typeof UpdateSubjectProgress>;
export const UpdateSubjectProgress = t.Object(
  {
    epStatus: t.Optional(t.Integer({ minimum: 0, description: '书籍条目章节进度' })),
    volStatus: t.Optional(t.Integer({ minimum: 0, description: '书籍条目卷数进度' })),
  },
  { $id: 'UpdateSubjectProgress' },
);

export type IUpdateEpisodeProgress = Static<typeof UpdateEpisodeProgress>;
export const UpdateEpisodeProgress = t.Object(
  {
    type: t.Optional(Ref(EpisodeCollectionStatus)),
    batch: t.Optional(
      t.Boolean({ description: '是否批量更新(看到当前章节), 批量更新时 type 无效' }),
    ),
  },
  { $id: 'UpdateEpisodeProgress' },
);

export type ISearchSubject = Static<typeof SearchSubject>;
export const SearchSubject = t.Object(
  {
    keyword: t.String({ description: '搜索关键词' }),
    sort: t.Optional(Ref(SubjectSearchSort)),
    filter: t.Optional(Ref(SubjectSearchFilter)),
  },
  { $id: 'SearchSubject' },
);

export type ISearchCharacter = Static<typeof SearchCharacter>;
export const SearchCharacter = t.Object(
  {
    keyword: t.String({ description: '搜索关键词' }),
    filter: t.Optional(Ref(CharacterSearchFilter)),
  },
  { $id: 'SearchCharacter' },
);

export type ISearchPerson = Static<typeof SearchPerson>;
export const SearchPerson = t.Object(
  {
    keyword: t.String({ description: '搜索关键词' }),
    filter: t.Optional(Ref(PersonSearchFilter)),
  },
  { $id: 'SearchPerson' },
);
