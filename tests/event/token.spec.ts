import { afterEach, expect, test } from 'vitest';

import { db, op, schema } from '@app/drizzle';
import { handle } from '@app/event/token.ts';
import { EventOp } from '@app/event/type';
import { byToken, invalidateTokenCache } from '@app/lib/auth/index.ts';
import { sleep } from '@app/lib/utils/index.ts';

const testUserID = 382951;

const tokens: string[] = [];

async function createToken(expiresIn = 3600_000): Promise<string> {
  const token = `test-access-token-${Math.random().toString(36).slice(2, 12)}`;
  await db.insert(schema.chiiAccessToken).values({
    type: 0,
    accessToken: token,
    clientID: '',
    userID: testUserID.toString(),
    expiredAt: new Date(Date.now() + expiresIn),
    info: '{}',
  });
  tokens.push(token);

  // populate the auth cache
  await expect(byToken(token)).resolves.toMatchObject({ userID: testUserID });

  return token;
}

function event(op: EventOp, token: string) {
  return {
    topic: 'debezium.chii.bangumi.chii_oauth_access_tokens',
    key: '1',
    value: Buffer.from(
      JSON.stringify({
        op,
        before: { access_token: token },
        after: op === EventOp.Delete ? null : { access_token: token },
      }),
    ),
  };
}

afterEach(async () => {
  if (tokens.length === 0) {
    return;
  }

  await db
    .delete(schema.chiiAccessToken)
    .where(op.inArray(schema.chiiAccessToken.accessToken, tokens));

  await Promise.all(tokens.map((token) => invalidateTokenCache(token)));
  tokens.length = 0;
});

test('should drop cached access token on delete event', async () => {
  const token = await createToken();

  await db.delete(schema.chiiAccessToken).where(op.eq(schema.chiiAccessToken.accessToken, token));

  // the deleted token is still served from cache
  await expect(byToken(token)).resolves.toMatchObject({ userID: testUserID });

  await handle(event(EventOp.Delete, token));

  await expect(byToken(token)).rejects.toThrow(/can't find access token/);
});

test('should drop cached access token on update event', async () => {
  const token = await createToken();

  await db
    .update(schema.chiiAccessToken)
    .set({ expiredAt: new Date() })
    .where(op.eq(schema.chiiAccessToken.accessToken, token));

  await expect(byToken(token)).resolves.toMatchObject({ userID: testUserID });

  await handle(event(EventOp.Update, token));

  await expect(byToken(token)).rejects.toThrow(/can't find access token/);
});

test('should not serve cached access token after it expires', async () => {
  // MySQL `expires` has second precision, so the stored expiry may be up to 1s earlier
  const token = await createToken(2000);

  await sleep(2200);

  await expect(byToken(token)).rejects.toThrow(/can't find access token/);
});
