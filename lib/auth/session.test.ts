import { DateTime } from 'luxon';
import { afterEach, beforeEach, expect, test } from 'vitest';

import { db, op, schema } from '@app/drizzle';

import { create, get, revoke } from './session.ts';

beforeEach(async () => {
  await db.delete(schema.chiiOsWebSessions);
});

afterEach(async () => {
  await db.delete(schema.chiiOsWebSessions);
});

test('should create and get session', async () => {
  const token = await create({
    id: 382951,
    regTime: DateTime.fromISO('2010-01-10 10:05:20').toUnixInteger(),
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
    userID: 382951,
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
