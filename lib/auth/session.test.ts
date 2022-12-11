import { expect, test, afterEach, beforeEach } from 'vitest';

import prisma from '../prisma';
import { create, get, revoke } from './session';

beforeEach(async () => {
  await prisma.chii_os_web_sessions.deleteMany();
});

afterEach(async () => {
  await prisma.chii_os_web_sessions.deleteMany();
});

test('should create and get session', async () => {
  const token = await create({
    id: 382951,
    regTime: Math.trunc(new Date('2010-01-10 10:05:20').getTime() / 1000),
  });

  const session = await prisma.chii_os_web_sessions.findFirst({ where: { key: token } });

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
  await prisma.chii_os_web_sessions.create({
    data: {
      key: token,
      value: Buffer.from(''),
      user_id: 0,
      created_at: Math.trunc(Date.now() / 1000),
      expired_at: Math.trunc(Date.now() / 1000) + 60 * 60 * 242 * 30,
    },
  });

  await revoke(token);

  const session = await prisma.chii_os_web_sessions.findFirst({ where: { key: token } });

  expect(session).toBeDefined();
});
