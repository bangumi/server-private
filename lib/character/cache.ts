import { createSlimCacheKey } from '@app/lib/cache-keys.ts';

export function getSlimCacheKey(id: number): string {
  return createSlimCacheKey('crt', 2, id);
}
