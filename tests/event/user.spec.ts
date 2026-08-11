import { afterEach, beforeEach, expect, test } from 'vitest';

import { db, op, schema } from '@app/drizzle';
import { handleFields, handleFriend } from '@app/event/user.ts';
import redis from '@app/lib/redis.ts';
import {
  getFollowersCacheKey,
  getFriendsCacheKey,
  getFriendsCacheVersionKey,
  getPrivacyCacheKey,
  getStatsCacheKey,
} from '@app/lib/user/cache.ts';
import { fetchPrivacyByUserID } from '@app/lib/user/privacy.ts';

const testUserID = 900_003;
const testFriendID = 900_004;

const friendsCacheVersionKey = getFriendsCacheVersionKey(testUserID);
const friendsCacheKey = getFriendsCacheKey(testUserID, 3);
const invalidatedFriendshipCacheKeys = [
  getFollowersCacheKey(testFriendID),
  getStatsCacheKey(testUserID, 'friend'),
];

beforeEach(async () => {
  await redis.del(
    getPrivacyCacheKey(testUserID),
    friendsCacheVersionKey,
    friendsCacheKey,
    ...invalidatedFriendshipCacheKeys,
  );
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
});

afterEach(async () => {
  await redis.del(
    getPrivacyCacheKey(testUserID),
    friendsCacheVersionKey,
    friendsCacheKey,
    ...invalidatedFriendshipCacheKeys,
  );
  await db.delete(schema.chiiUserFields).where(op.eq(schema.chiiUserFields.uid, testUserID));
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

test('should advance friendship cache generation from friend event', async () => {
  await redis.set(friendsCacheVersionKey, 3);
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

  await expect(redis.get(friendsCacheVersionKey)).resolves.toBe('4');
  await expect(redis.smembers(friendsCacheKey)).resolves.toEqual(
    expect.arrayContaining(['0', testFriendID.toString()]),
  );
  await expect(redis.mget(invalidatedFriendshipCacheKeys)).resolves.toEqual(
    invalidatedFriendshipCacheKeys.map(() => null),
  );
});
