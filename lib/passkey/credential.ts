import { createError } from '@fastify/error';
import httpCodes from 'http-status-codes';
import t from 'typebox';
import { Value } from 'typebox/value';

import { db, op, schema } from '@app/drizzle';

export const PasskeyNotFoundError = createError<[]>(
  'PASSKEY_NOT_FOUND',
  'passkey not found',
  httpCodes.NOT_FOUND,
);

export interface PasskeyCredential {
  id: number;
  uid: number;
  rpId: string;
  credentialId: string;
  publicKey: string;
  webauthnUserId: string;
  signCount: number;
  transports: string[];
  deviceType: string;
  backedUp: boolean;
  nickname: string;
  createdAt: number;
  lastUsedAt: number;
  revokedAt: number;
}

const TransportsSchema = t.Array(t.String());

function parseTransports(raw: string): string[] {
  return Value.Parse(TransportsSchema, JSON.parse(raw));
}

function formatCredential(
  row: typeof schema.chiiPasskeyCredentials.$inferSelect,
): PasskeyCredential {
  return {
    id: row.id,
    uid: row.uid,
    rpId: row.rpId,
    credentialId: row.credentialId,
    publicKey: row.publicKey,
    webauthnUserId: row.webauthnUserId,
    signCount: row.signCount,
    transports: parseTransports(row.transports),
    deviceType: row.deviceType,
    backedUp: row.backedUp === 1,
    nickname: row.nickname,
    createdAt: row.createdAt,
    lastUsedAt: row.lastUsedAt,
    revokedAt: row.revokedAt,
  };
}

export async function fetchCredentialByCredentialId(
  credentialId: string,
  rpId: string,
  uid?: number,
): Promise<PasskeyCredential | null> {
  const conditions = op.and(
    op.eq(schema.chiiPasskeyCredentials.credentialId, credentialId),
    op.eq(schema.chiiPasskeyCredentials.rpId, rpId),
    op.eq(schema.chiiPasskeyCredentials.revokedAt, 0),
    uid === undefined ? undefined : op.eq(schema.chiiPasskeyCredentials.uid, uid),
  );

  const [row] = await db.select().from(schema.chiiPasskeyCredentials).where(conditions).limit(1);

  return row ? formatCredential(row) : null;
}

export async function markCredentialUsed(id: number, newCounter: number) {
  const now = Math.floor(Date.now() / 1000);
  await db
    .update(schema.chiiPasskeyCredentials)
    .set({
      signCount: newCounter,
      lastUsedAt: now,
    })
    .where(op.eq(schema.chiiPasskeyCredentials.id, id));
}
