import dayjs from 'dayjs';
import { afterEach, beforeEach, expect, test } from 'vitest';

import { SessionRepo } from '@app/lib/orm';

import { create, get, revoke } from './session';

beforeEach(async () => {
  await SessionRepo.delete({});
});

afterEach(async () => {
  await SessionRepo.delete({});
});

test('should create and get session', async () => {
  const token = await create({
    id: 382951,
    regTime: dayjs('2010-01-10 10:05:20').unix(),
  });

  const session = await SessionRepo.findOne({ where: { key: token } });

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
  await SessionRepo.insert({
    key: token,
    value: Buffer.from(''),
    userID: 0,
    createdAt: dayjs().unix(),
    expiredAt: dayjs().unix() + 60 * 60 * 242 * 30,
  });

  await revoke(token);

  const session = await SessionRepo.findOne({ where: { key: token } });

  expect(session).toBeDefined();
});
