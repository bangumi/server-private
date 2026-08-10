import { describe, expect, test } from 'vitest';

import { emptyAuth } from '@app/lib/auth/index.ts';
import redis from '@app/lib/redis.ts';
import { fetchSlimUserByID, fetchSlimUsersByIDs } from '@app/lib/types/fetcher.ts';
import { getFriendsCacheKey, getSlimCacheKey } from '@app/lib/user/cache.ts';
import { applyUserFriendship, applyUsersFriendship } from '@app/lib/user/friendship.ts';
import { fetchViewerFriendIDs } from '@app/lib/user/utils.ts';

describe('user friendship', () => {
  test('should apply friendship to explicit users', () => {
    const friend = { id: 2, isFriend: false };
    const stranger = { id: 3, isFriend: true };

    expect(applyUserFriendship(friend, new Set([2]))).toBe(friend);
    applyUsersFriendship([friend, stranger], new Set([2]));
    expect(friend.isFriend).toBe(true);
    expect(stranger.isFriend).toBe(false);
  });

  test('should fetch the authenticated user friend IDs', async () => {
    const viewerID = 900_102;
    const friendID = 900_103;
    const cacheKey = getFriendsCacheKey(viewerID);
    await redis.set(cacheKey, JSON.stringify([friendID]));

    try {
      const friendIDs = await fetchViewerFriendIDs({
        ...emptyAuth(),
        login: true,
        userID: viewerID,
      });
      expect(friendIDs).toEqual(new Set([friendID]));
    } finally {
      await redis.del(cacheKey);
    }
  });

  test('should return no friend IDs for unauthenticated requests', async () => {
    expect(await fetchViewerFriendIDs(emptyAuth())).toEqual(new Set());
  });

  test('should apply friendship after reading a canonical cached user', async () => {
    const userID = 900_104;
    const cacheKey = getSlimCacheKey(userID);
    await redis.set(cacheKey, JSON.stringify({ id: userID, isFriend: false }));

    try {
      const user = await fetchSlimUserByID(userID, new Set([userID]));
      expect(user?.isFriend).toBe(true);
      expect(JSON.parse((await redis.get(cacheKey)) ?? '{}')).toMatchObject({ isFriend: false });
    } finally {
      await redis.del(cacheKey);
    }
  });

  test('should apply friendship to cached users in a batch', async () => {
    const friendID = 900_105;
    const strangerID = 900_106;
    const friendCacheKey = getSlimCacheKey(friendID);
    const strangerCacheKey = getSlimCacheKey(strangerID);
    await redis.mset(
      friendCacheKey,
      JSON.stringify({ id: friendID, isFriend: false }),
      strangerCacheKey,
      JSON.stringify({ id: strangerID, isFriend: false }),
    );

    try {
      const users = await fetchSlimUsersByIDs([friendID, strangerID], new Set([friendID]));
      expect(users[friendID]?.isFriend).toBe(true);
      expect(users[strangerID]?.isFriend).toBe(false);
    } finally {
      await redis.del(friendCacheKey, strangerCacheKey);
    }
  });
});
