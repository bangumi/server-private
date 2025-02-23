export function getSlimCacheKey(uid: number): string {
  return `user:v2:slim:${uid}`;
}

export function getStatsCacheKey(uid: number, section: string): string {
  return `user:stats:${uid}:${section}`;
}

export function getFriendsCacheKey(uid: number): string {
  return `user:friends:${uid}`;
}

export function getFollowersCacheKey(uid: number): string {
  return `user:followers:${uid}`;
}

export function getRelationCacheKey(uid: number, fid: number): string {
  return `user:relation:${uid}:${fid}`;
}

export function getJoinedGroupsCacheKey(uid: number): string {
  return `user:groups:${uid}`;
}
