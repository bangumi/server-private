import client from '@app/lib/search/client.ts';
import type { SubjectType } from '@app/lib/subject/type.ts';

const index = client.index('subjects');

interface ResponseSubject {
  name: string;
  name_cn: string;
  id: number;
  locked: boolean;
  nsfw: boolean;
  typeID: SubjectType;
}

export interface SearchRequest {
  keyword: string;
  sort: string;
  filter: SearchFilter;
}

export interface SearchFilter {
  type: SubjectType[];
  tag: string[];
  air_date: string[];
  rating: string[];
  rank: string[];
  meta_tags: string[];
  nsfw?: boolean;
}
