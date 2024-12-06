export interface Subject {
  subject_id: string;
  subject_type_id: string;
  subject_name: string;
  subject_name_cn: string;
  subject_series: string;
  collect_comment: string;
  collect_rate: number;
}

export type SubjectBatch = Record<number, Subject>;

export interface ProgressBatch {
  eps_total: string;
  eps_update: number;
  vols_total: string;
  vols_update: number;
  subject_id: string;
  subject_name: string;
  subject_type_id?: number;
}

export interface ProgressSingle {
  ep_id: string;
  ep_name: string;
  ep_sort: string;
  subject_id: string;
  subject_name: string;
}

export interface MonoSingle {
  cat: number;
  id: number;
  name: string;
}

export type MonoBatch = Record<number, MonoSingle>;
