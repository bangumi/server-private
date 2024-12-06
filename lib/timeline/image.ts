export interface Subject {
  subject_id: string;
  images: string;
}

export type SubjectBatch = Record<number, Subject>;

export interface Mono {
  cat: number;
  id: number;
  images: string;
}

export type MonoBatch = Record<number, Mono>;
