export function getItemCacheKey(id: number): string {
  return `tml:item:${id}`;
}

export function getUserCacheKey(uid: number | string) {
  return `tml:user:${uid}:v2`;
}

export function getUserVisitCacheKey(uid: number) {
  return `tml:visit:user:${uid}`;
}

export function getInboxCacheKey(uid: number | string) {
  return `tml:inbox:${uid}:v2`;
}

export function getInboxVisitCacheKey(uid: number) {
  return `tml:visit:inbox:${uid}`;
}
