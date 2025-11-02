import { createSlimCacheKey, createTopicCacheKey } from '@app/lib/cache-keys.ts';

export function getSlimCacheKey(id: number): string {
  return createSlimCacheKey('grp', 3, id);
}

export function getTopicCacheKey(id: number): string {
  return createTopicCacheKey('grp', id);
}
