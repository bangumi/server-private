export function getItemCacheKey(id: number): string {
  return `tml:item:${id}`;
}

export function getUserCacheKey(uid: number) {
  return `tml:user:${uid}`;
}

export function getUserVisitCacheKey(uid: number) {
  return `tml:visit:user:${uid}`;
}

export function getInboxCacheKey(uid: number) {
  return `tml:inbox:${uid}`;
}

export function getInboxVisitCacheKey(uid: number) {
  return `tml:visit:inbox:${uid}`;
}
