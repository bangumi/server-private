/* eslint-disable @typescript-eslint/require-await */
import { createError } from '@fastify/error';

import type { IAuth } from '@app/lib/auth';
import { TypedCache } from '@app/lib/cache';

export const InvalidRateLimitType = createError<[string]>(
  'RATE_LIMIT_TYPE_INVALID',
  'invalid rate limit type: %s. please provide a valid type.',
  400,
);

export const RateLimitExceeded = createError<[]>(
  'RATE_LIMIT_EXCEEDED',
  'rate limit exceeded. please try again later.',
  429,
);

const cache = TypedCache<string, number[]>((key) => key);

type LimitType = keyof typeof LIMIT_RULES;

interface LimitRule {
  count: number;
  minutes: number;
  validate?: number;
  hibernate?: number;
}

const LIMIT_RULES: Record<string, LimitRule> = {
  app: { count: 5, minutes: 10 },
  ep: { count: 10, minutes: 10 },
  blog: { count: 3, minutes: 30 },
  index: { count: 3, minutes: 30 },
  group: { count: 3, minutes: 30 },
  doujin: { count: 3, minutes: 30 },
  event: { count: 1, minutes: 60 },
  event_topics: { count: 3, minutes: 30 },
  subject: { count: 3, minutes: 30 },
  club_topics: { count: 1, minutes: 30 },
  crt_post: { count: 1, minutes: 1, validate: 7, hibernate: 5 },
  prsn_post: { count: 1, minutes: 1, validate: 7, hibernate: 5 },
  like: { count: 2, minutes: 1 },
};

const isRateLimited = async (uid: number, type: LimitType) => {
  const limitRule = LIMIT_RULES[type];
  if (!limitRule) {
    throw new InvalidRateLimitType(type);
  }
  const { count, minutes } = limitRule;

  const now = Date.now();
  const cacheKey = `rate-limit:${type}:${uid}`;

  const userRequests = (await cache.get(cacheKey)) || [];

  const validRequests = userRequests.filter((timestamp) => now - timestamp < minutes * 60 * 1000);

  if (validRequests.length >= count) {
    return true;
  }

  validRequests.push(now);
  await cache.set(cacheKey, validRequests, minutes * 60);
  return false;
};

export const rateLimiter = (type: LimitType) => async (req: { auth: IAuth }) => {
  if (await isRateLimited(req.auth.userID, type)) {
    throw new RateLimitExceeded();
  }
};
