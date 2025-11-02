import {
  createItemCacheKey,
  createSlimCacheKey,
  createTopicCacheKey,
} from '@app/lib/cache-keys.ts';

import type { SubjectFilter, SubjectSort } from './type';

export function getCalendarCacheKey(): string {
  return 'sbj:calendar';
}

export function getSlimCacheKey(id: number): string {
  return createSlimCacheKey('sbj', 2, id);
}

export function getItemCacheKey(id: number): string {
  return createItemCacheKey('sbj', 2, id);
}

export function getEpCacheKey(id: number): string {
  return `sbj:v2:ep:${id}`;
}

export function getListCacheKey(filter: SubjectFilter, sort: SubjectSort, page: number): string {
  let key = `sbj:list:${filter.type}:${sort}:${filter.nsfw ? 1 : 0}`;
  if (filter.cat) {
    key += `:cat:${filter.cat}`;
  }
  if (filter.series !== undefined) {
    key += `:series:${filter.series ? 1 : 0}`;
  }
  if (filter.year) {
    key += `:year:${filter.year}`;
  }
  if (filter.month) {
    key += `:month:${filter.month}`;
  }
  if (filter.tags) {
    key += `:tags:${filter.tags.toSorted().join(',')}`;
  }
  key += `:page:${page}`;
  return key;
}

export function getTopicCacheKey(id: number): string {
  return createTopicCacheKey('sbj', id);
}
