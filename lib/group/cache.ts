export function getSlimCacheKey(id: number): string {
  return `grp:v3:slim:${id}`;
}

export function getTopicCacheKey(id: number): string {
  return `grp:topic:${id}`;
}
