export interface User {
  uid: string;
  username: string;
  nickname: string;
}

export type UserBatch = Record<number, User>;

export interface Group {
  grp_id: string;
  grp_name: string;
  grp_title: string;
  grp_desc: string;
}

export type GroupBatch = Record<number, Group>;

export interface NewSubject {
  subject_id: number;
  subject_name: string;
  subject_name_cn: string;
}

export interface Subject {
  subject_id: number;
  subject_type_id: number;
  collect_id: number;
  collect_comment: string;
  collect_rate: number;
}

export type SubjectBatch = Record<number, Subject>;

export interface ProgressBatch {
  subject_id: number;
  subject_type_id: number;
  eps_total: string;
  eps_update?: number;
  vols_total: string;
  vols_update?: number;
}

export interface ProgressSingle {
  subject_id: number;
  subject_type_id: number;
  ep_id: number;
}

export interface Nickname {
  before: string;
  after: string;
}

export interface Blog {
  entry_id: string;
  entry_title: string;
  entry_desc: string;
}

export interface Index {
  idx_id: string;
  idx_title: string;
  idx_desc: string;
}

export interface MonoSingle {
  cat: number;
  id: number;
  name: string;
}

export type MonoBatch = Record<number, MonoSingle>;
