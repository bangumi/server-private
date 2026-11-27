import { DateTime } from 'luxon';
import { afterEach, beforeEach, expect, test } from 'vitest';

import { db, op, schema } from '@app/drizzle';
import { invalidatePasswordCache } from '@app/lib/auth/index.ts';

import { create, get, revoke } from './session.ts';

const testUserID = 382951;

async function fetchPasswordCrypt(): Promise<string> {
  const [u] = await db
    .select({ password: schema.chiiUsers.passwordCrypt })
    .from(schema.chiiUsers)
    .where(op.eq(schema.chiiUsers.id, testUserID))
    .limit(1);

  if (!u) {
    throw new Error(`user ${testUserID} not found`);
  }

  return u.password;
}

beforeEach(async () => {
  await db.delete(schema.chiiOsWebSessions);
});

afterEach(async () => {
  await db.delete(schema.chiiOsWebSessions);
});

test('should create and get session', async () => {
  const token = await create({
    id: testUserID,
    regTime: DateTime.fromISO('2010-01-10 10:05:20').toUnixInteger(),
    password: await fetchPasswordCrypt(),
  });

  const session = await db.query.chiiOsWebSessions.findFirst({
    where: op.sql`\`key\` = ${token} collate utf8mb4_bin`,
  });

  expect(session).toBeDefined();

  const auth = await get(token);

  expect(auth).toBeDefined();
  expect(auth).toMatchObject({
    login: true,
    groupID: 10,
    userID: testUserID,
  });
});

test('should revoke session', async () => {
  const token = 'fake-random-session-token';
  await db.insert(schema.chiiOsWebSessions).values({
    key: token,
    value: Buffer.from(''),
    userID: 0,
    createdAt: DateTime.now().toUnixInteger(),
    expiredAt: DateTime.now().toUnixInteger() + 60 * 60 * 242 * 30,
  });

  await revoke(token);
  const session = await db.query.chiiOsWebSessions.findFirst({
    where: op.eq(schema.chiiOsWebSessions.key, token),
  });

  expect(session).toBeDefined();
  expect(session?.expiredAt).toBeLessThan(DateTime.now().toUnixInteger() + 1);
});

test('should reject session after password changed', async () => {
  const original = await fetchPasswordCrypt();
  const token = await create({
    id: testUserID,
    regTime: DateTime.fromISO('2010-01-10 10:05:20').toUnixInteger(),
    password: original,
  });

  await expect(get(token)).resolves.toMatchObject({ login: true, userID: testUserID });

  const changed = original === 'x'.repeat(64) ? 'y'.repeat(64) : 'x'.repeat(64);

  try {
    await db
      .update(schema.chiiUsers)
      .set({ passwordCrypt: changed })
      .where(op.eq(schema.chiiUsers.id, testUserID));
    await invalidatePasswordCache(testUserID);

    await expect(get(token)).resolves.toBeNull();
  } finally {
    await db
      .update(schema.chiiUsers)
      .set({ passwordCrypt: original })
      .where(op.eq(schema.chiiUsers.id, testUserID));
    await invalidatePasswordCache(testUserID);
  }
});

test('should reject session created without password binding', async () => {
  const token = 'legacy-session-without-password';
  const now = DateTime.now().toUnixInteger();
  await db.insert(schema.chiiOsWebSessions).values({
    key: token,
    value: Buffer.from(
      JSON.stringify({ user_id: testUserID, created_at: now, expired_at: now + 3600 }),
    ),
    userID: testUserID,
    createdAt: now,
    expiredAt: now + 3600,
  });

  await expect(get(token)).resolves.toBeNull();
});
