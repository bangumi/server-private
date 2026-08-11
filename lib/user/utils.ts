import { db, op, schema } from '@app/drizzle';
import { UnexpectedNotFoundError } from '@app/lib/error.ts';
import redis from '@app/lib/redis.ts';
import * as fetcher from '@app/lib/types/fetcher.ts';
import type * as res from '@app/lib/types/res.ts';
import {
  getFollowersCacheKey,
  getFriendsCacheKey,
  getFriendsCacheVersionKey,
  getJoinedGroupsCacheKey,
  getStatsCacheKey,
} from '@app/lib/user/cache.ts';
import { intval } from '@app/lib/utils/index.ts';

const FRIENDS_CACHE_TTL = 3600;
const FRIENDS_CACHE_SENTINEL = 0;

export function parseBlocklist(blocklist: string): number[] {
  return blocklist
    .split(',')
    .map((x) => x.trim())
    .map((x) => intval(x))
    .filter((x) => x !== 0);
}

async function fetchFriendsFromDB(uid: number): Promise<number[]> {
  const friends = await db
    .select({ fid: schema.chiiFriends.fid })
    .from(schema.chiiFriends)
    .where(op.eq(schema.chiiFriends.uid, uid));
  return friends.map((friend) => friend.fid);
}

async function getCurrentFriendsCacheKey(uid: number): Promise<string> {
  const version = intval((await redis.get(getFriendsCacheVersionKey(uid))) ?? '0');
  return getFriendsCacheKey(uid, version);
}

async function cacheFriends(cacheKey: string, friendIDs: readonly number[]): Promise<void> {
  await redis
    .multi()
    .sadd(cacheKey, FRIENDS_CACHE_SENTINEL, ...friendIDs)
    .expire(cacheKey, FRIENDS_CACHE_TTL)
    .exec();
}

/** Cached: Get friend ids of user(uid) */
export async function fetchFriends(uid?: number): Promise<number[]> {
  if (!uid) {
    return [];
  }

  const cacheKey = await getCurrentFriendsCacheKey(uid);
  const members = await redis.smembers(cacheKey);
  if (members.includes(FRIENDS_CACHE_SENTINEL.toString())) {
    return members
      .map((member) => intval(member))
      .filter((member) => member !== FRIENDS_CACHE_SENTINEL);
  }

  const friendIDs = await fetchFriendsFromDB(uid);
  await cacheFriends(cacheKey, friendIDs);
  return friendIDs;
}

/** Cached: Get the ids among candidates that user(uid) follows. */
export async function fetchFriendIDs(
  uid: number | undefined,
  candidates: readonly number[],
): Promise<ReadonlySet<number>> {
  if (!uid || candidates.length === 0) {
    return new Set();
  }

  const ids = [...new Set(candidates)];
  const cacheKey = await getCurrentFriendsCacheKey(uid);
  const memberships = await redis.smismember(cacheKey, FRIENDS_CACHE_SENTINEL, ...ids);
  if (memberships[0] === 1) {
    return new Set(ids.filter((_, index) => memberships[index + 1] === 1));
  }

  const friendIDs = await fetchFriendsFromDB(uid);
  await cacheFriends(cacheKey, friendIDs);
  const friends = new Set(friendIDs);
  return new Set(ids.filter((id) => friends.has(id)));
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
  const friendIDs = await fetchFriendIDs(uid, [another]);
  return friendIDs.has(another);
}

export async function invalidateFriendshipCaches(uid: number, fid: number): Promise<void> {
  await redis
    .multi()
    .incr(getFriendsCacheVersionKey(uid))
    .del(getFollowersCacheKey(fid), getStatsCacheKey(uid, 'friend'))
    .exec();
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
    isFriend: false,
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
