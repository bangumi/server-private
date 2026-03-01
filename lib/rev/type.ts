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

export interface CharacterRev {
  crt_name: string;
  crt_infobox: string;
  crt_summary: string;
  extra: {
    img?: string;
  };
}

export interface PersonRev {
  prsn_name: string;
  prsn_infobox: string;
  prsn_summary: string;
  profession: {
    producer?: string;
    mangaka?: string;
    artist?: string;
    seiyu?: string;
    writer?: string;
    illustrator?: string;
    actor?: string;
  };
  extra: {
    img?: string;
  };
}

export interface SubjectRelationRev {
  self: Record<
    string,
    {
      subject_id: string;
      subject_type_id: string;
      relation_type: string;
      relation_order: string;
      related_subject_id: string;
      related_subject_type_id: string;
    }
  >;
  remote: Record<
    string,
    {
      subject_id: string;
      subject_type_id: string;
      relation_type: string;
      related_subject_id: string;
      related_subject_type_id: string;
    }
  >;
}

export type SubjectCharacterRev = Record<
  string,
  {
    subject_id: string;
    crt_type: string;
    crt_id: string;
    crt_order: number;
  }
>;

export type SubjectPersonRev = Record<
  string,
  {
    subject_id: string;
    position: string;
    prsn_id: string;
  }
>;

export type PersonSubjectRev = Record<
  string,
  {
    subject_id: string;
    position: string;
    prsn_id: number;
  }
>;

export type PersonCastRev = Record<
  string,
  {
    subject_id: string;
    crt_id: string;
    prsn_id: number;
    summary: string | null;
  }
>;

export type CharacterSubjectRev = Record<
  string,
  {
    subject_id: string;
    crt_type: string;
    crt_id: number;
    crt_order: number;
  }
>;

export type CharacterCastRev = Record<
  string,
  {
    subject_id: string;
    prsn_id: string;
    crt_id: number;
    summary: string | null;
  }
>;
