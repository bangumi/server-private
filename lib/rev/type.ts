import type { Static } from 'typebox';
import t from 'typebox';

export interface RevHistory {
  revId: number;
  revType: number;
  revMid: number;
  revTextId: number;
  revCreator: number;
  createdAt: number;
  revEditSummary: string;
}

export interface RevText {
  revTextId: number;
  revText: Buffer;
}

export const RevType = {
  subjectEdit: 1,
  subjectLock: 103,
  subjectUnlock: 104,
  subjectMerge: 11, // 条目管理
  subjectErase: 12,
  subjectRelation: 17, // 条目关联
  subjectCharacterRelation: 5, // 条目->角色关联
  subjectCastRelation: 6, // 条目->声优关联
  subjectPersonRelation: 10, // 条目->人物关联

  characterEdit: 2, // 角色编辑
  characterMerge: 13, // 角色管理
  characterErase: 14,
  characterSubjectRelation: 4, // 角色->条目关联
  characterCastRelation: 7, // 角色->声优关联

  personEdit: 3, // 人物编辑
  personMerge: 15,
  personErase: 16,
  personCastRelation: 8, // 人物->声优关联
  personSubjectRelation: 9, // 人物->条目关联

  episodeEdit: 18, // 章节
  // 章节管理
  episodeMerge: 181,
  episodeMove: 182,
  episodeLock: 183,
  episodeUnlock: 184,
  episodeErase: 185,
} as const;

export const EpisodeEditTypes = [
  RevType.episodeEdit,
  RevType.episodeMerge,
  RevType.episodeMove,
  RevType.episodeLock,
  RevType.episodeUnlock,
  RevType.episodeErase,
] as const;

export interface EpTextRev {
  ep_sort: string;
  ep_disc: string;
  ep_type: string;
  ep_name: string;
  ep_name_cn: string;
  ep_duration: string;
  ep_airdate: string;
  ep_desc: string;
}

export type ICharacterRev = Static<typeof CharacterRev>;
export const CharacterRev = t.Object(
  {
    crt_name: t.String(),
    crt_infobox: t.String(),
    crt_summary: t.String(),
    extra: t.Object({
      img: t.Optional(t.String()),
    }),
  },
  { $id: 'CharacterRev' },
);

export type IPersonRev = Static<typeof PersonRev>;
export const PersonRev = t.Object(
  {
    prsn_name: t.String(),
    prsn_infobox: t.String(),
    prsn_summary: t.String(),
    profession: t.Object({
      producer: t.Optional(t.String()),
      mangaka: t.Optional(t.String()),
      artist: t.Optional(t.String()),
      seiyu: t.Optional(t.String()),
      writer: t.Optional(t.String()),
      illustrator: t.Optional(t.String()),
      actor: t.Optional(t.String()),
    }),
    extra: t.Object({
      img: t.Optional(t.String()),
    }),
  },
  { $id: 'PersonRev' },
);

const SubjectRelationRevSelf = t.Object({
  subject_id: t.String(),
  subject_type_id: t.String(),
  relation_type: t.String(),
  relation_order: t.Integer(),
  related_subject_id: t.String(),
  related_subject_type_id: t.String(),
});
const SubjectRelationRevRemote = t.Object({
  subject_id: t.String(),
  subject_type_id: t.String(),
  relation_type: t.Union([t.String(), t.Integer()]),
  related_subject_id: t.String(),
  related_subject_type_id: t.String(),
});
export type ISubjectRelationRev = Static<typeof SubjectRelationRev>;
export const SubjectRelationRev = t.Object(
  {
    self: t.Union([t.Array(SubjectRelationRevSelf), t.Record(t.String(), SubjectRelationRevSelf)]),
    remote: t.Union([
      t.Array(SubjectRelationRevRemote),
      t.Record(t.String(), SubjectRelationRevRemote),
    ]),
  },
  { $id: 'SubjectRelationRev' },
);

const SubjectCharacterRevSingle = t.Object({
  subject_id: t.String(),
  crt_type: t.String(),
  crt_id: t.String(),
  crt_order: t.Integer(),
});
export type ISubjectCharacterRev = Static<typeof SubjectCharacterRev>;
export const SubjectCharacterRev = t.Union(
  [t.Record(t.String(), SubjectCharacterRevSingle), t.Array(SubjectCharacterRevSingle)],
  { $id: 'SubjectCharacterRev' },
);

export type ISubjectPersonRev = Static<typeof SubjectPersonRev>;
const SubjectPersonRevSingle = t.Object({
  subject_id: t.String(),
  position: t.String(),
  prsn_id: t.String(),
});
export const SubjectPersonRev = t.Union(
  [t.Record(t.String(), SubjectPersonRevSingle), t.Array(SubjectPersonRevSingle)],
  { $id: 'SubjectPersonRev' },
);

export type IPersonSubjectRev = Static<typeof PersonSubjectRev>;
const PersonSubjectRevSingle = t.Object({
  subject_id: t.String(),
  position: t.String(),
  prsn_id: t.Integer(),
});
export const PersonSubjectRev = t.Union(
  [t.Record(t.String(), PersonSubjectRevSingle), t.Array(PersonSubjectRevSingle)],
  { $id: 'PersonSubjectRev' },
);

export type IPersonCastRev = Static<typeof PersonCastRev>;
const PersonCastRevSingle = t.Object({
  subject_id: t.String(),
  crt_id: t.String(),
  prsn_id: t.Integer(),
  summary: t.Union([t.String(), t.Null()]),
});
export const PersonCastRev = t.Union(
  [t.Record(t.String(), PersonCastRevSingle), t.Array(PersonCastRevSingle)],
  { $id: 'PersonCastRev' },
);

export type ICharacterSubjectRev = Static<typeof CharacterSubjectRev>;
const CharacterSubjectRevSingle = t.Object({
  subject_id: t.String(),
  crt_type: t.String(),
  crt_id: t.Integer(),
  crt_order: t.Integer(),
});
export const CharacterSubjectRev = t.Union(
  [t.Record(t.String(), CharacterSubjectRevSingle), t.Array(CharacterSubjectRevSingle)],
  { $id: 'CharacterSubjectRev' },
);

export type ICharacterCastRev = Static<typeof CharacterCastRev>;
const CharacterCastRevSingle = t.Object({
  subject_id: t.String(),
  prsn_id: t.String(),
  crt_id: t.Integer(),
  summary: t.Union([t.String(), t.Null()]),
});
export const CharacterCastRev = t.Union(
  [t.Record(t.String(), CharacterCastRevSingle), t.Array(CharacterCastRevSingle)],
  { $id: 'CharacterCastRev' },
);
