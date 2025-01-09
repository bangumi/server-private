export function getSlimCacheKey(id: number): string {
  return `user:slim:${id}`;
}

export function getStatsCacheKey(id: number, section: string): string {
  return `user:stats:${id}:${section}`;
}
