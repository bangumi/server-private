import { describe, expect, test } from 'vitest';

import redis from '@app/lib/redis.ts';
import { fetchSlimUserByID, fetchSlimUsersByIDs } from '@app/lib/types/fetcher.ts';
import {
  getFriendsCacheKey,
  getFriendsCacheVersionKey,
  getSlimCacheKey,
} from '@app/lib/user/cache.ts';
import { applyUserFriendship, applyUsersFriendship } from '@app/lib/user/friendship.ts';
import { fetchFriendIDs, invalidateFriendshipCaches } from '@app/lib/user/utils.ts';

describe('user friendship', () => {
  test('should apply friendship to explicit users', () => {
    const friend = { id: 2, isFriend: false };
    const stranger = { id: 3, isFriend: true };

    expect(applyUserFriendship(friend, new Set([2]))).toBe(friend);
    applyUsersFriendship([friend, stranger], new Set([2]));
    expect(friend.isFriend).toBe(true);
    expect(stranger.isFriend).toBe(false);
  });

  test('should fetch matching friend IDs', async () => {
    const viewerID = 900_102;
    const friendID = 900_103;
    const cacheKey = getFriendsCacheKey(viewerID, 0);
    await redis.sadd(cacheKey, 0, friendID);

    try {
      const friendIDs = await fetchFriendIDs(viewerID, [friendID, friendID + 1]);
      expect(friendIDs).toEqual(new Set([friendID]));
    } finally {
      await redis.del(cacheKey);
    }
  });

  test('should return no friend IDs without a viewer', async () => {
    expect(await fetchFriendIDs(undefined, [1])).toEqual(new Set());
  });

  test('should ignore friendship data from a previous cache generation', async () => {
    const viewerID = 900_110;
    const friendID = 900_111;
    const versionKey = getFriendsCacheVersionKey(viewerID);
    const previousCacheKey = getFriendsCacheKey(viewerID, 0);
    const currentCacheKey = getFriendsCacheKey(viewerID, 1);
    await redis.sadd(previousCacheKey, 0, friendID);

    try {
      await invalidateFriendshipCaches(viewerID, friendID);
      await redis.sadd(currentCacheKey, 0);

      expect(await fetchFriendIDs(viewerID, [friendID])).toEqual(new Set());
      expect(await redis.sismember(previousCacheKey, friendID)).toBe(1);
    } finally {
      await redis.del(versionKey, previousCacheKey, currentCacheKey);
    }
  });

  test('should apply friendship after reading a canonical cached user', async () => {
    const userID = 900_104;
    const cacheKey = getSlimCacheKey(userID);
    const friendsCacheKey = getFriendsCacheKey(userID + 1, 0);
    await redis.set(cacheKey, JSON.stringify({ id: userID, isFriend: false }));
    await redis.sadd(friendsCacheKey, 0, userID);

    try {
      const user = await fetchSlimUserByID(userID, userID + 1);
      expect(user?.isFriend).toBe(true);
      expect(JSON.parse((await redis.get(cacheKey)) ?? '{}')).toMatchObject({ isFriend: false });
    } finally {
      await redis.del(cacheKey, friendsCacheKey, getFriendsCacheVersionKey(userID + 1));
    }
  });

  test('should apply friendship to cached users in a batch', async () => {
    const friendID = 900_105;
    const strangerID = 900_106;
    const friendCacheKey = getSlimCacheKey(friendID);
    const strangerCacheKey = getSlimCacheKey(strangerID);
    const viewerID = 900_109;
    const friendsCacheKey = getFriendsCacheKey(viewerID, 0);
    await redis.mset(
      friendCacheKey,
      JSON.stringify({ id: friendID, isFriend: false }),
      strangerCacheKey,
      JSON.stringify({ id: strangerID, isFriend: false }),
    );
    await redis.sadd(friendsCacheKey, 0, friendID);

    try {
      const users = await fetchSlimUsersByIDs([friendID, strangerID], viewerID);
      expect(users[friendID]?.isFriend).toBe(true);
      expect(users[strangerID]?.isFriend).toBe(false);
    } finally {
      await redis.del(
        friendCacheKey,
        strangerCacheKey,
        friendsCacheKey,
        getFriendsCacheVersionKey(viewerID),
      );
    }
  });
});
