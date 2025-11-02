/** Utility functions for generating cache keys */

/**
 * Generate a slim cache key for a given entity type
 *
 * @param prefix - The entity prefix (e.g., 'user', 'sbj', 'crt')
 * @param version - The cache version number
 * @param id - The entity ID
 * @returns The cache key string
 */
export function createSlimCacheKey(prefix: string, version: number, id: number): string {
  return `${prefix}:v${version}:slim:${id}`;
}

/**
 * Generate a topic cache key for a given entity type
 *
 * @param prefix - The entity prefix (e.g., 'grp', 'sbj')
 * @param id - The topic ID
 * @returns The cache key string
 */
export function createTopicCacheKey(prefix: string, id: number): string {
  return `${prefix}:topic:${id}`;
}

/**
 * Generate an item cache key for a given entity type
 *
 * @param prefix - The entity prefix (e.g., 'sbj', 'tml')
 * @param version - The cache version number
 * @param id - The entity ID
 * @returns The cache key string
 */
export function createItemCacheKey(prefix: string, version: number, id: number): string {
  return `${prefix}:v${version}:item:${id}`;
}
