import { createSlimCacheKey } from '@app/lib/cache-keys.ts';

export function getSlimCacheKey(id: number): string {
  return createSlimCacheKey('idx', 6, id);
}
