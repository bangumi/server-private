import type { TimelineMonoCat } from './type';

export interface User {
  uid: number;
}

export type UserBatch = Record<number, User>;

export interface Group {
  grp_id: number;
}

export type GroupBatch = Record<number, Group>;

export interface Eden {
  eden_id: number;
}

export type EdenBatch = Record<number, Eden>;

export interface NewSubject {
  subject_id: number;
}

export interface Subject {
  subject_id: number;
  collect_id: number;
  collect_comment: string;
  collect_rate: number;
}

export type SubjectBatch = Record<number, Subject>;

export interface ProgressBatch {
  subject_id?: number;
  subject_type_id?: number;
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
  entry_id: number;
  entry_title: string;
  entry_desc: string;
}

export interface Index {
  idx_id: number;
  idx_title: string;
  idx_desc: string;
}

export interface MonoSingle {
  cat: TimelineMonoCat;
  id: number;
}

export type MonoBatch = Record<number, MonoSingle>;
