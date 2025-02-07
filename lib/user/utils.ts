import { db, op } from '@app/drizzle/db.ts';
import * as schema from '@app/drizzle/schema.ts';
import redis from '@app/lib/redis.ts';
import {
  getFollowersCacheKey,
  getFriendsCacheKey,
  getRelationCacheKey,
} from '@app/lib/user/cache.ts';

/** Cached: Get friend ids of user(uid) */
export async function fetchFriends(uid?: number): Promise<number[]> {
  if (!uid) {
    return [];
  }

  const cached = await redis.get(getFriendsCacheKey(uid));
  if (cached) {
    return JSON.parse(cached) as number[];
  }

  const friends = await db
    .select({ fid: schema.chiiFriends.fid })
    .from(schema.chiiFriends)
    .where(op.eq(schema.chiiFriends.uid, uid));
  const result = friends.map((x) => x.fid);
  await redis.setex(getFriendsCacheKey(uid), 3600, JSON.stringify(result));
  return result;
}

/** Cached: Get follower ids of user(uid) */
export async function fetchFollowers(uid?: number): Promise<number[]> {
  if (!uid) {
    return [];
  }

  const cached = await redis.get(getFollowersCacheKey(uid));
  if (cached) {
    return JSON.parse(cached) as number[];
  }

  const followers = await db
    .select({ uid: schema.chiiFriends.uid })
    .from(schema.chiiFriends)
    .where(op.eq(schema.chiiFriends.fid, uid));
  const result = followers.map((x) => x.uid);
  await redis.setex(getFollowersCacheKey(uid), 3600, JSON.stringify(result));
  return result;
}

/** Cached: Is user(another) is friend of user(uid) */
export async function isFriends(uid: number, another: number): Promise<boolean> {
  const cached = await redis.get(getRelationCacheKey(uid, another));
  if (cached) {
    return cached === '1';
  }

  const [d] = await db
    .select({ uid: schema.chiiFriends.uid, fid: schema.chiiFriends.fid })
    .from(schema.chiiFriends)
    .where(op.and(op.eq(schema.chiiFriends.uid, uid), op.eq(schema.chiiFriends.fid, another)))
    .limit(1);
  const result = d ? 1 : 0;
  await redis.setex(getRelationCacheKey(uid, another), 3600, result);
  return result === 1;
}
