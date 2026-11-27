import { afterEach, beforeEach, expect, test } from 'vitest';

import { db, op, schema } from '@app/drizzle';
import { handle, handleFields, handleFriend } from '@app/event/user.ts';
import { byUserID, invalidateUserCache, UserGroup } from '@app/lib/auth/index.ts';
import redis from '@app/lib/redis.ts';
import {
  getFollowersCacheKey,
  getFriendsCacheKey,
  getPrivacyCacheKey,
  getSlimCacheKey,
  getStatsCacheKey,
} from '@app/lib/user/cache.ts';
import { fetchPrivacyByUserID } from '@app/lib/user/privacy.ts';

const testUserID = 900_003;
const testFriendID = 900_004;

const friendsCacheKey = getFriendsCacheKey(testUserID);
const invalidatedFriendshipCacheKeys = [
  getFollowersCacheKey(testFriendID),
  getStatsCacheKey(testUserID, 'friend'),
];

async function clearUserCaches() {
  await redis.del(
    getPrivacyCacheKey(testUserID),
    friendsCacheKey,
    getSlimCacheKey(testUserID),
    ...invalidatedFriendshipCacheKeys,
  );
  await invalidateUserCache(testUserID);
}

beforeEach(async () => {
  await clearUserCaches();
  await db.delete(schema.chiiUserFields).where(op.eq(schema.chiiUserFields.uid, testUserID));
  await db.insert(schema.chiiUserFields).values({
    uid: testUserID,
    site: '',
    location: '',
    bio: '',
    homepage: '',
    privacy: '',
    blocklist: '',
  });
  await db.delete(schema.chiiUsers).where(op.eq(schema.chiiUsers.id, testUserID));
  await db.insert(schema.chiiUsers).values({
    id: testUserID,
    nickname: '',
    avatar: '',
    groupid: UserGroup.Normal,
    newNotify: 0,
    sign: '',
    passwordCrypt: '',
    acl: '',
  });
});

afterEach(async () => {
  await clearUserCaches();
  await db.delete(schema.chiiUserFields).where(op.eq(schema.chiiUserFields.uid, testUserID));
  await db.delete(schema.chiiUsers).where(op.eq(schema.chiiUsers.id, testUserID));
});

test('should invalidate user privacy cache from memberfields event', async () => {
  await expect(fetchPrivacyByUserID(testUserID)).resolves.toBe('');

  await db
    .update(schema.chiiUserFields)
    .set({ privacy: '{"show_nsfw_subject":1}' })
    .where(op.eq(schema.chiiUserFields.uid, testUserID));

  await expect(fetchPrivacyByUserID(testUserID)).resolves.toBe('');

  await handleFields({
    topic: 'debezium.chii.bangumi.chii_memberfields',
    key: JSON.stringify({ uid: testUserID }),
    value: Buffer.from(JSON.stringify({ op: 'u' })),
  });

  await expect(fetchPrivacyByUserID(testUserID)).resolves.toBe('{"show_nsfw_subject":1}');
});

test('should invalidate user auth cache from members event', async () => {
  await expect(byUserID(testUserID)).resolves.toMatchObject({ groupID: UserGroup.Normal });

  await db
    .update(schema.chiiUsers)
    .set({ groupid: UserGroup.WikiEditor })
    .where(op.eq(schema.chiiUsers.id, testUserID));

  await expect(byUserID(testUserID)).resolves.toMatchObject({ groupID: UserGroup.Normal });

  await handle({
    topic: 'debezium.chii.bangumi.chii_members',
    key: JSON.stringify({ uid: testUserID }),
    value: Buffer.from(JSON.stringify({ op: 'u' })),
  });

  await expect(byUserID(testUserID)).resolves.toMatchObject({ groupID: UserGroup.WikiEditor });
});

test('should invalidate friendship caches from friend event', async () => {
  await redis.sadd(friendsCacheKey, 0, testFriendID);
  await Promise.all(invalidatedFriendshipCacheKeys.map((key) => redis.set(key, 'cached')));

  await handleFriend({
    topic: 'debezium.chii.bangumi.chii_friends',
    key: '{}',
    value: Buffer.from(
      JSON.stringify({
        op: 'c',
        after: {
          frd_uid: testUserID,
          frd_fid: testFriendID,
        },
      }),
    ),
  });

  await expect(redis.exists(friendsCacheKey)).resolves.toBe(0);
  await expect(redis.mget(invalidatedFriendshipCacheKeys)).resolves.toEqual(
    invalidatedFriendshipCacheKeys.map(() => null),
  );
});
