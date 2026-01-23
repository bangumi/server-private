export const TIMELINE_EVENT_CHANNEL = 'events:tml:create';

export function getItemCacheKey(id: number): string {
  return `tml:v4:item:${id}`;
}

export function getUserCacheKey(uid: number | string, cat: number | string) {
  return `tml:v3:user:${uid}:${cat}`;
}

export function getUserVisitCacheKey(uid: number, cat: number) {
  return `tml:visit:user:${uid}:${cat}`;
}

export function getInboxCacheKey(uid: number | string, cat: number | string) {
  return `tml:v3:inbox:${uid}:${cat}`;
}

export function getInboxVisitCacheKey(uid: number, cat: number) {
  return `tml:visit:inbox:${uid}:${cat}`;
}
