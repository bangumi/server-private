import type { Static } from '@sinclair/typebox';
import { Type as t } from '@sinclair/typebox';

export type DoujinMemo = Static<typeof Doujin>;
export const Doujin = t.Object(
  {
    id: t.Integer(),
    name: t.Optional(t.String()),
    title: t.String(),
  },
  { additionalProperties: false },
);

export type DoujinType5Memo = Static<typeof DoujinType5>;
export const DoujinType5 = t.Object(
  {
    id: t.Integer(),
    name: t.Optional(t.String()),
    title: t.String(),
    type: t.String(),
  },
  { additionalProperties: false },
);

export type MonoMemo = Static<typeof Mono>;
export const Mono = t.Object(
  {
    name: t.String(),
    cat: t.Integer(),
    id: t.Integer(),
  },
  { additionalProperties: false },
);

/** Cat=TimelineType.Group && (type === 3 || type === 4) */
export type IndexMemo = Static<typeof Index>;
export const Index = t.Object(
  {
    idx_id: t.Integer(),
    idx_title: t.String(),
    idx_desc: t.String(),
  },
  { additionalProperties: false },
);

/** Cat=TimelineType.Relation && type == 2 */
export type RelationMemo = Static<typeof Relation>;
export const Relation = t.Object(
  {
    uid: t.Integer(),
    username: t.String(),
    nickname: t.String(),
  },
  { additionalProperties: false },
);
// const group = /;

export type GroupMemo = Static<typeof Group>;
export const Group = t.Object(
  {
    grp_id: t.Optional(t.String()),
    grp_name: t.String(),
    grp_title: t.String(),
    grp_desc: t.String(),
  },
  { additionalProperties: false },
);

export type BlogMemo = Static<typeof Blog>;
export const Blog = t.Object(
  {
    entry_title: t.String(),
    entry_desc: t.String(),
    entry_id: t.Integer(),
  },
  { additionalProperties: false },
);

export type ProgressMemo = Static<typeof Progress>;

export const Progress = t.Object(
  {
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
  },
  { additionalProperties: false },
);

export type Progress2Memo = Static<typeof Progress2>;

export const Progress2 = t.Object(
  {
    ep_id: t.Integer(),
    ep_name: t.String(),
    ep_sort: t.String(),
    subject_id: t.Integer(),
    subject_name: t.String(),
  },
  { additionalProperties: false },
);

/** Cat=TimelineType.say, type=2 */
export type RenameMemo = Static<typeof Rename>;
export const Rename = t.Object(
  {
    before: t.String(),
    after: t.String(),
  },
  { additionalProperties: false },
);

// cat=3
export type SubjectMemo = Static<typeof Subject>;
export const Subject = t.Object(
  {
    subject_id: t.String(),
    subject_type_id: t.Optional(t.String()),
    subject_name: t.String(),
    subject_name_cn: t.String(),
    subject_series: t.Optional(t.String()),
    collect_comment: t.Optional(t.String()),
    collect_rate: t.Optional(t.Integer()),
  },
  { additionalProperties: false },
);

export type WikiMemo = Static<typeof Wiki>;
export const Wiki = t.Object(
  {
    subject_name: t.String(),
    subject_name_cn: t.String(),
    subject_id: t.Integer(),
    subject_series: t.Optional(t.Integer()),
  },
  { additionalProperties: false },
);
