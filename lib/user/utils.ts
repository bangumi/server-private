import { db, op, schema } from '@app/drizzle';
import { UnexpectedNotFoundError } from '@app/lib/error.ts';
import redis from '@app/lib/redis.ts';
import * as fetcher from '@app/lib/types/fetcher.ts';
import type * as res from '@app/lib/types/res.ts';
import {
  getFollowersCacheKey,
  getFriendsCacheKey,
  getJoinedGroupsCacheKey,
  getRelationCacheKey,
} from '@app/lib/user/cache.ts';
import { intval } from '@app/lib/utils/index.ts';

export function parseBlocklist(blocklist: string): number[] {
  return blocklist
    .split(',')
    .map((x) => x.trim())
    .map((x) => intval(x))
    .filter((x) => x !== 0);
}

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

export function ghostUser(uid: number): res.ISlimUser {
  return {
    id: 0,
    username: uid.toString(),
    nickname: `deleted or missing user ${uid}`,
    avatar: {
      small: '',
      medium: '',
      large: '',
    },
    group: 0,
    sign: '',
    joinedAt: 0,
  };
}

/** Cached */
export async function fetchUserX(uid: number): Promise<res.ISlimUser> {
  const user = await fetcher.fetchSlimUserByID(uid);
  if (!user) {
    throw new UnexpectedNotFoundError(`user ${uid} not found`);
  }
  return user;
}

/** Cached: Get group ids that user(uid) has joined */
export async function fetchJoinedGroups(uid?: number): Promise<number[]> {
  if (!uid) {
    return [];
  }

  const cached = await redis.get(getJoinedGroupsCacheKey(uid));
  if (cached) {
    return JSON.parse(cached) as number[];
  }

  const groups = await db
    .select({ gid: schema.chiiGroupMembers.gid })
    .from(schema.chiiGroupMembers)
    .where(op.eq(schema.chiiGroupMembers.uid, uid));
  const result = groups.map((x) => x.gid);
  await redis.setex(getJoinedGroupsCacheKey(uid), 3600, JSON.stringify(result));
  return result;
}
