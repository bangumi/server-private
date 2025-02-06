export function getSlimCacheKey(uid: number): string {
  return `user:slim:${uid}`;
}

export function getStatsCacheKey(uid: number, section: string): string {
  return `user:stats:${uid}:${section}`;
}

export function getFriendsCacheKey(uid: number): string {
  return `user:friends:${uid}`;
}

export function getRelationCacheKey(uid: number, fid: number): string {
  return `user:relation:${uid}:${fid}`;
}
