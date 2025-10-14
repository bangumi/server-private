import { afterEach, describe, expect, test } from 'vitest';

import { db, op, schema } from '@app/drizzle';
import { emptyAuth } from '@app/lib/auth/index.ts';
import { createTestServer } from '@app/tests/utils.ts';

import { setup } from './report.ts';

const testUserID = 382951;

describe('report API', () => {
  afterEach(async () => {
    // Clean up test data
    await db.delete(schema.chiiIssues).where(op.eq(schema.chiiIssues.operator, testUserID));
  });

  test('should create a report successfully', async () => {
    const app = createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        userID: testUserID,
      },
    });
    await app.register(setup);

    const res = await app.inject({
      url: '/report',
      method: 'post',
      payload: {
        type: 6, // TYPE_REPORT_USER
        id: 12345,
        value: 1, // 辱骂、人身攻击
        comment: 'Test report comment',
      },
    });

    expect(res.statusCode).toBe(200);
    const data = res.json();
    expect(data).toHaveProperty('message');
    expect(data.message).toBe('感谢报告，我们会尽快处理');

    // Verify the report was created
    const [report] = await db
      .select()
      .from(schema.chiiIssues)
      .where(
        op.and(
          op.eq(schema.chiiIssues.type, 6),
          op.eq(schema.chiiIssues.mid, 12345),
          op.eq(schema.chiiIssues.operator, testUserID),
        ),
      );
    expect(report).toBeDefined();
    expect(report?.value).toBe(1);
    expect(report?.reason).toBe('Test report comment');
    expect(report?.status).toBe(0); // OPEN
  });

  test('should create a report without comment', async () => {
    const app = createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        userID: testUserID,
      },
    });
    await app.register(setup);

    const res = await app.inject({
      url: '/report',
      method: 'post',
      payload: {
        type: 7, // TYPE_REPORT_GROUP_TOPIC
        id: 54321,
        value: 8, // 广告
      },
    });

    expect(res.statusCode).toBe(200);
    const data = res.json();
    expect(data.message).toBe('感谢报告，我们会尽快处理');

    // Verify the report was created
    const [report] = await db
      .select()
      .from(schema.chiiIssues)
      .where(
        op.and(
          op.eq(schema.chiiIssues.type, 7),
          op.eq(schema.chiiIssues.mid, 54321),
          op.eq(schema.chiiIssues.operator, testUserID),
        ),
      );
    expect(report).toBeDefined();
    expect(report?.value).toBe(8);
    expect(report?.reason).toBe('');
  });

  test('should reject duplicate report', async () => {
    const app = createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        userID: testUserID,
      },
    });
    await app.register(setup);

    // Create first report
    const res1 = await app.inject({
      url: '/report',
      method: 'post',
      payload: {
        type: 6,
        id: 99999,
        value: 2,
        comment: 'First report',
      },
    });
    expect(res1.statusCode).toBe(200);

    // Try to create duplicate report
    const res2 = await app.inject({
      url: '/report',
      method: 'post',
      payload: {
        type: 6,
        id: 99999,
        value: 3,
        comment: 'Duplicate report',
      },
    });
    expect(res2.statusCode).toBe(409);
  });

  test('should reject invalid report type', async () => {
    const app = createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        userID: testUserID,
      },
    });
    await app.register(setup);

    const res = await app.inject({
      url: '/report',
      method: 'post',
      payload: {
        type: 999, // Invalid type
        id: 12345,
        value: 1,
      },
    });
    expect(res.statusCode).toBe(400);
  });

  test('should reject invalid report reason', async () => {
    const app = createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        userID: testUserID,
      },
    });
    await app.register(setup);

    const res = await app.inject({
      url: '/report',
      method: 'post',
      payload: {
        type: 6,
        id: 12345,
        value: 999, // Invalid reason
      },
    });
    expect(res.statusCode).toBe(400);
  });

  test('should require authentication', async () => {
    const app = createTestServer({
      auth: emptyAuth(),
    });
    await app.register(setup);

    const res = await app.inject({
      url: '/report',
      method: 'post',
      payload: {
        type: 6,
        id: 12345,
        value: 1,
      },
    });
    expect(res.statusCode).toBe(401);
  });
});
