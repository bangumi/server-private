import { DateTime } from 'luxon';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { db, op, schema } from '@app/drizzle';
import { emptyAuth } from '@app/lib/auth/index.ts';
import { CollectionType } from '@app/lib/subject/type.ts';
import { createTestServer } from '@app/tests/utils.ts';

import { setup } from './subject-home.ts';

const testUserID = 287622;
const testSubjectID = 12; // 动画，含 eps/characters/staff/relations

async function insertInterest() {
  const now = DateTime.now().toUnixInteger();
  await db.insert(schema.chiiSubjectInterests).values({
    uid: testUserID,
    subjectID: testSubjectID,
    subjectType: 2,
    rate: 8,
    type: CollectionType.Doing,
    hasComment: 1,
    comment: 'subject home test comment',
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
}

async function resetInterest() {
  await db
    .delete(schema.chiiSubjectInterests)
    .where(
      op.and(
        op.eq(schema.chiiSubjectInterests.uid, testUserID),
        op.eq(schema.chiiSubjectInterests.subjectID, testSubjectID),
      ),
    );
}

describe('subject home', () => {
  beforeEach(async () => {
    vi.spyOn(DateTime, 'now').mockReturnValue(DateTime.fromSeconds(1020240000) as DateTime<true>);
    await insertInterest();
  });

  afterEach(async () => {
    vi.clearAllMocks();
    await resetInterest();
  });

  test('should return all blocks for logged out user', async () => {
    const app = createTestServer();
    await app.register(setup);

    const res = await app.inject({
      method: 'get',
      url: `/subjects/${testSubjectID}/home`,
    });
    expect(res.statusCode).toBe(200);
    const data = res.json();

    expect(data.subject.id).toBe(testSubjectID);
    expect(data.subject.name).toBeTruthy();
    expect(data.subject.interest).toBeUndefined();
    for (const key of [
      'episodes',
      'characters',
      'staff',
      'relations',
      'recs',
      'comments',
      'reviews',
      'indexes',
      'topics',
    ]) {
      expect(Array.isArray(data[key]), key).toBe(true);
    }
    expect(data.episodes.length).toBeGreaterThan(0);
    expect(data.characters.length).toBeGreaterThan(0);
    expect(data.staff.length).toBeGreaterThan(0);
    expect(data.relations.length).toBeGreaterThan(0);
  });

  test('should include interest and episode status for logged in user', async () => {
    const app = createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        userID: testUserID,
      },
    });
    await app.register(setup);

    const res = await app.inject({
      method: 'get',
      url: `/subjects/${testSubjectID}/home`,
    });
    expect(res.statusCode).toBe(200);
    const data = res.json();

    expect(data.subject.interest).toMatchObject({
      rate: 8,
      comment: 'subject home test comment',
      type: CollectionType.Doing,
    });
    // 至少有一集存在且结构正确
    expect(data.episodes.length).toBeGreaterThan(0);
    expect(data.episodes[0]).toMatchObject({
      id: expect.any(Number),
      subjectID: testSubjectID,
    });
  });

  test('should return 404 for missing subject', async () => {
    const app = createTestServer();
    await app.register(setup);

    const res = await app.inject({
      method: 'get',
      url: '/subjects/999999/home',
    });
    expect(res.statusCode).toBe(404);
  });
});
