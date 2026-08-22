import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { db, op, schema } from '@app/drizzle';
import { emptyAuth } from '@app/lib/auth/index.ts';
import { createTestServer } from '@app/tests/utils.ts';

import { setup } from './index.ts';

const testUserID = 987004;

async function deleteTestTokens() {
  await db
    .delete(schema.chiiAccessToken)
    .where(op.eq(schema.chiiAccessToken.userID, testUserID.toString()));
}

describe('demo tokens', () => {
  beforeEach(deleteTestTokens);
  afterEach(deleteTestTokens);

  test('should create and delete access token', async () => {
    const app = createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        userID: testUserID,
      },
    });
    await app.register(setup);

    const created = await app.inject({
      method: 'post',
      url: '/access-tokens',
      body: {
        name: 'test token',
        days: 1,
      },
    });

    expect(created.statusCode).toBe(200);
    const token = created.json();
    const [tokenRow] = await db
      .select()
      .from(schema.chiiAccessToken)
      .where(
        op.and(
          op.eq(schema.chiiAccessToken.userID, testUserID.toString()),
          op.eq(schema.chiiAccessToken.accessToken, token),
        ),
      )
      .limit(1);
    if (!tokenRow) {
      throw new Error('missing token row');
    }

    const deleted = await app.inject({
      method: 'delete',
      url: '/access-tokens',
      body: {
        id: tokenRow.id,
      },
    });

    expect(deleted.statusCode).toBe(200);
    const [expired] = await db
      .select()
      .from(schema.chiiAccessToken)
      .where(op.eq(schema.chiiAccessToken.id, tokenRow.id))
      .limit(1);
    expect(expired?.expiredAt.getTime()).toBeLessThan(tokenRow.expiredAt.getTime());
  });
});
