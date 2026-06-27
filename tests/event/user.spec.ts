import { afterEach, beforeEach, expect, test } from 'vitest';

import { db, op, schema } from '@app/drizzle';
import { handleFields } from '@app/event/user.ts';
import redis from '@app/lib/redis.ts';
import { getPrivacyCacheKey } from '@app/lib/user/cache.ts';
import { fetchPrivacyByUserID } from '@app/lib/user/privacy.ts';

const testUserID = 900_003;

beforeEach(async () => {
  await redis.del(getPrivacyCacheKey(testUserID));
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
  await redis.del(getPrivacyCacheKey(testUserID));
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
