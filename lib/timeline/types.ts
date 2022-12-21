import type { Static } from '@sinclair/typebox';
import { Type as t } from '@sinclair/typebox';

export const Doujin = t.Object({
  id: t.Integer(),
  name: t.Optional(t.String()),
  title: t.String(),
});

export type DoujinMemo = Static<typeof Doujin>;

export const Mono = t.Object({
  name: t.String(),
  cat: t.Integer(),
  id: t.Integer(),
});

export type MonoMemo = Static<typeof Mono>;

export const Index = t.Object({
  idx_id: t.Integer(),
  idx_title: t.String(),
  idx_desc: t.String(),
});

/** Cat=TimelineType.Group && (type === 3 || type === 4) */
export type IndexMemo = Static<typeof Index>;

const relation = t.Object({
  uid: t.String(),
  username: t.String(),
  nickname: t.String(),
});

/** Cat=TimelineType.Relation && type == 2 */
export const Relation = t.Union([t.Record(t.String(), relation), relation]);
export type RelationMemo = Static<typeof Relation>;

const group = t.Object({
  grp_id: t.Optional(t.String()),
  grp_name: t.String(),
  grp_title: t.String(),
  grp_desc: t.String(),
});

export const Group = t.Union([t.Record(t.String(), group), group]);

export type GroupMemo = Static<typeof Group>;

export const Blog = t.Object({
  entry_title: t.String(),
  entry_desc: t.String(),
  entry_id: t.Integer(),
});

export type BlogMemo = Static<typeof Blog>;

export const Progress = t.Object({
  vols_total: t.Optional(t.String()),
  subject_name: t.Optional(t.String()),
  eps_update: t.Optional(t.Integer()),
  vols_update: t.Optional(t.Integer()),
  eps_total: t.Optional(t.Integer()),
  subject_id: t.Optional(t.Integer()),
  subject_type_id: t.Optional(t.Integer()),

  // ep_name: t.Optional(t.String()),
  // ep_sort: t.Optional(t.Integer()),
  // ep_id: t.Optional(t.Integer()),
});

export type ProgressMemo = Static<typeof Progress>;

export const Progress2 = t.Object({
  ep_id: t.String(),
  ep_name: t.String(),
  ep_sort: t.String(),
  subject_id: t.Integer(),
  subject_name: t.String(),
});
export type Progress2Memo = Static<typeof Progress2>;

export const Rename = t.Object({
  before: t.String(),
  after: t.String(),
});

/** Cat=TimelineType.say, type=2 */
export type RenameMemo = Static<typeof Rename>;

export const Subject = t.Object({
  subject_id: t.String(),
  subject_type_id: t.String(),
  subject_name: t.String(),
  subject_name_cn: t.String(),
  subject_series: t.String(),
  collect_comment: t.String(),
  collect_rate: t.Integer({ maximum: 10, minimum: 0 }),
});

export type SubjectMemo = Static<typeof Subject>;

export const Wiki = t.Object({
  subject_name: t.String(),
  subject_name_cn: t.String(),
  subject_id: t.Integer(),
});

export type WikiMemo = Static<typeof Wiki>;
