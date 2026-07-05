import type { Static } from 'typebox';
import t from 'typebox';
import { Value } from 'typebox/value';

import redis from '@app/lib/redis.ts';

import { hashSHA256 } from './webauthn.ts';

export interface CreateChallengeParams {
  /** Challenge string from SDK-generated options.challenge */
  challenge: string;
  uid: number;
  type: 'register' | 'login';
  rpId: string;
  ip?: string;
  userAgent?: string;
  webauthnUserId?: string;
}

export interface ChallengeData {
  challenge: string;
  uid: number;
  type: 'register' | 'login';
  rpId: string;
  webauthnUserId: string;
}

const challengeTTL = 300; // 5 minutes

/** Schema for Redis-stored challenge data — guards against stale payloads after code updates */
const ChallengePayloadSchema = t.Object({
  uid: t.Integer(),
  type: t.Union([t.Literal('register'), t.Literal('login')]),
  rpId: t.String({ minLength: 1 }),
  webauthnUserId: t.String(),
  ip: t.String(),
  userAgentHash: t.String(),
});

type IChallengePayload = Static<typeof ChallengePayloadSchema>;

function challengeKey(challenge: string): string {
  return `passkey:challenge:${challenge}`;
}

export async function createChallenge(params: CreateChallengeParams): Promise<ChallengeData> {
  const data: ChallengeData = {
    challenge: params.challenge,
    uid: params.uid,
    type: params.type,
    rpId: params.rpId,
    webauthnUserId: params.webauthnUserId ?? '',
  };

  const payload: IChallengePayload = {
    uid: data.uid,
    type: data.type,
    rpId: data.rpId,
    webauthnUserId: data.webauthnUserId,
    ip: params.ip ?? '',
    userAgentHash: params.userAgent ? hashSHA256(params.userAgent) : '',
  };

  await redis.setex(challengeKey(params.challenge), challengeTTL, JSON.stringify(payload));

  return data;
}

export async function consumeChallenge(
  challenge: string,
  type: 'register' | 'login',
  rpId: string,
  uid?: number,
): Promise<ChallengeData | null> {
  const key = challengeKey(challenge);

  // GETDEL is atomic: get the value and delete the key in one operation,
  // ensuring one-time consumption without TOCTOU race condition.
  const raw = await redis.getdel(key);
  if (!raw) {
    return null;
  }

  let stored: IChallengePayload;
  try {
    stored = Value.Parse(ChallengePayloadSchema, JSON.parse(raw));
  } catch {
    return null;
  }

  if (stored.type !== type || stored.rpId !== rpId) {
    return null;
  }

  if (uid !== undefined && stored.uid !== uid) {
    return null;
  }

  return {
    challenge,
    uid: stored.uid,
    type: stored.type,
    rpId: stored.rpId,
    webauthnUserId: stored.webauthnUserId,
  };
}
