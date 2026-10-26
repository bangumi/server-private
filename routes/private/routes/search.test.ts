import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { db, op, schema } from '@app/drizzle';
import redis from '@app/lib/redis.ts';
import { search as searchSubject } from '@app/lib/search/subject';
import { CollectionType } from '@app/lib/subject/type.ts';
import { createTestServer } from '@app/tests/utils.ts';

import { setup } from './search.ts';

vi.mock('@app/lib/search/subject', () => ({
  search: vi.fn(),
}));

const TEST_USER_ID = 7654321;
const OTHER_USER_ID = 7654322;
const SUBJECT_IDS = [12, 8];
const UPDATED_AT = 1020240000;

async function resetInterests() {
  await db
    .delete(schema.chiiSubjectInterests)
    .where(
      op.and(
        op.inArray(schema.chiiSubjectInterests.uid, [TEST_USER_ID, OTHER_USER_ID]),
        op.inArray(schema.chiiSubjectInterests.subjectID, SUBJECT_IDS),
      ),
    );
}

async function insertInterest(uid: number, subjectID: number, rate: number) {
  await db.insert(schema.chiiSubjectInterests).values({
    uid,
    subjectID,
    subjectType: 2,
    rate,
    type: CollectionType.Doing,
    hasComment: 0,
    comment: '',
    tag: '',
    epStatus: 3,
    volStatus: 0,
    wishDateline: 0,
    doingDateline: UPDATED_AT,
    collectDateline: 0,
    onHoldDateline: 0,
    droppedDateline: 0,
    createIp: '127.0.0.1',
    updateIp: '127.0.0.1',
    updatedAt: UPDATED_AT,
    privacy: 0,
  });
}

describe('subject search', () => {
  beforeEach(async () => {
    await resetInterests();
    await redis.flushdb();
    await insertInterest(TEST_USER_ID, 12, 8);
    await insertInterest(OTHER_USER_ID, 8, 6);
    vi.mocked(searchSubject).mockResolvedValue({ ids: SUBJECT_IDS, total: 2 });
  });

  afterEach(async () => {
    await resetInterests();
    await redis.flushdb();
    vi.clearAllMocks();
  });

  test('should include platform and only the current user interest', async () => {
    const app = createTestServer({
      auth: { login: true, userID: TEST_USER_ID, allowNsfw: true },
    });
    await app.register(setup);
    const res = await app.inject({
      method: 'post',
      url: '/search/subjects',
      body: { keyword: 'test', filter: { type: [2] } },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data).toHaveLength(2);
    for (const subject of body.data) {
      expect(subject.platform).toMatchObject({
        id: expect.any(Number),
        type: expect.any(String),
        typeCN: expect.any(String),
        alias: expect.any(String),
      });
    }
    expect(body.data[0].interest).toMatchObject({
      rate: 8,
      type: CollectionType.Doing,
      updatedAt: UPDATED_AT,
    });
    expect(body.data[1].interest).toBeUndefined();
    await app.close();

    const anonymous = createTestServer();
    await anonymous.register(setup);
    const anonymousRes = await anonymous.inject({
      method: 'post',
      url: '/search/subjects',
      body: { keyword: 'test', filter: { type: [2] } },
    });
    expect(anonymousRes.statusCode).toBe(200);
    expect(anonymousRes.json().data[0].platform).toBeDefined();
    expect(anonymousRes.json().data[0].interest).toBeUndefined();
    await anonymous.close();
  });
});
