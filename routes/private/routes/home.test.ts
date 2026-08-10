import { DateTime } from 'luxon';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { db, op, schema } from '@app/drizzle';
import { emptyAuth } from '@app/lib/auth/index.ts';
import { CollectionType } from '@app/lib/subject/type.ts';
import { createTestServer } from '@app/tests/utils.ts';

import { setup as calendarSetup } from './calendar.ts';
import { setup } from './home.ts';

const testUserID = 287622;
const testSubjectID = 12; // 动画，含 eps
const testGroupID = 4215; // testUserID 已加入的小组

async function insertHomeTestData() {
  const now = DateTime.now().toUnixInteger();
  // Doing 收藏，保证 progress 区块有数据
  await db.insert(schema.chiiSubjectInterests).values({
    uid: testUserID,
    subjectID: testSubjectID,
    subjectType: 2,
    rate: 0,
    type: CollectionType.Doing,
    hasComment: 0,
    comment: '',
    tag: '',
    epStatus: 1,
    volStatus: 0,
    wishDateline: 0,
    doingDateline: now,
    collectDateline: 0,
    onHoldDateline: 0,
    droppedDateline: 0,
    createIp: '127.0.0.1',
    updateIp: '127.0.0.1',
    updatedAt: now,
    privacy: 0,
  });
  // 已加入小组内的一条话题，保证 groupTopics 区块有数据
  await db.insert(schema.chiiGroupTopics).values({
    gid: testGroupID,
    uid: testUserID,
    title: 'home test topic',
    createdAt: now,
    updatedAt: now,
    replies: 0,
    state: 0,
    display: 1,
  });
}

async function resetHomeTestData() {
  await db
    .delete(schema.chiiSubjectInterests)
    .where(
      op.and(
        op.eq(schema.chiiSubjectInterests.uid, testUserID),
        op.eq(schema.chiiSubjectInterests.subjectID, testSubjectID),
      ),
    );
  await db
    .delete(schema.chiiGroupTopics)
    .where(
      op.and(
        op.eq(schema.chiiGroupTopics.gid, testGroupID),
        op.eq(schema.chiiGroupTopics.uid, testUserID),
        op.eq(schema.chiiGroupTopics.title, 'home test topic'),
      ),
    );
}

describe('home', () => {
  beforeEach(async () => {
    vi.spyOn(DateTime, 'now').mockReturnValue(DateTime.fromSeconds(1020240000) as DateTime<true>);
    await insertHomeTestData();
  });

  afterEach(async () => {
    vi.clearAllMocks();
    await resetHomeTestData();
  });

  test('should return public blocks only when not logged in', async () => {
    const app = createTestServer();
    await app.register(calendarSetup);
    await app.register(setup);

    const res = await app.inject({
      method: 'get',
      url: '/home',
    });
    expect(res.statusCode).toBe(200);
    const data = res.json();
    // 个人区块：未登录时为空
    expect(data.progress).toEqual([]);
    expect(data.timeline).toEqual([]);
    expect(data.groupTopics).toEqual([]);
    // 公开区块：返回数据
    expect(data.famousGroups.length).toBeGreaterThan(0);
    expect(data.hotSubjectTopics.length).toBeGreaterThan(0);
    expect(Object.keys(data.calendar).length).toBeGreaterThan(0);
  });

  test('should get home data for logged in user', async () => {
    const app = createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        userID: testUserID,
      },
    });
    await app.register(calendarSetup);
    await app.register(setup);

    const res = await app.inject({
      method: 'get',
      url: '/home',
    });
    expect(res.statusCode).toBe(200);
    const data = res.json();
    expect(data.progress.length).toBeGreaterThan(0);
    expect(data.timeline.length).toBeGreaterThan(0);
    expect(data.groupTopics.length).toBeGreaterThan(0);
    expect(data.famousGroups.length).toBeGreaterThan(0);
    expect(data.hotSubjectTopics.length).toBeGreaterThan(0);
    expect(Object.keys(data.calendar).length).toBeGreaterThan(0);
  });
});
