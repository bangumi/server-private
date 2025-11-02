import { createItemCacheKey } from '@app/lib/cache-keys.ts';

export function getItemCacheKey(id: number): string {
  return createItemCacheKey('tml', 4, id);
}

export function getUserCacheKey(uid: number | string) {
  return `tml:v3:user:${uid}`;
}

export function getUserVisitCacheKey(uid: number) {
  return `tml:visit:user:${uid}`;
}

export function getInboxCacheKey(uid: number | string) {
  return `tml:v3:inbox:${uid}`;
}

export function getInboxVisitCacheKey(uid: number) {
  return `tml:visit:inbox:${uid}`;
}
