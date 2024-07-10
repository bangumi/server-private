/* eslint-disable @typescript-eslint/require-await */
import { createError } from '@fastify/error';

import type { IAuth } from '@app/lib/auth';
import NodeCache from '@app/vendor/node-cache';

const cache = new NodeCache();

interface LimitRule {
  limit: string;
  validate?: number;
  hibernate?: number;
}

const LIMIT_RULES: Record<string, LimitRule> = {
  app: { limit: '5/10' },
  ep: { limit: '10/10' },
  blog: { limit: '3/30' },
  index: { limit: '3/30' },
  group: { limit: '3/30' },
  doujin: { limit: '3/30' },
  event: { limit: '1/60' },
  event_topics: { limit: '3/30' },
  subject: { limit: '3/30' },
  club_topics: { limit: '1/30' },
  crt_post: { limit: '1/1', validate: 7, hibernate: 5 },
  prsn_post: { limit: '1/1', validate: 7, hibernate: 5 },
  like: { limit: '2/1' },
};

const parseLimit = (limit: string) => {
  const [count, minutes] = limit.split('/').map(Number) as [number, number];
  return { count, minutes };
};

const isRateLimited = (key: number, type: string) => {
  const limitRules = LIMIT_RULES[type];
  if (!limitRules) {
    throw new Error('Invalid rate limit type');
  }

  const { count, minutes } = parseLimit(limitRules.limit);

  const now = Date.now();
  const cacheKey = `${key}:${type}`;
  const userRequests = cache.get<number[]>(cacheKey) || [];

  // Remove expired timestamps
  const validRequests = userRequests.filter((timestamp) => now - timestamp < minutes * 60 * 1000);

  if (validRequests.length >= count) {
    return true;
  }

  validRequests.push(now);
  cache.set(cacheKey, validRequests, minutes * 60);
  return false;
};

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

export const rateLimiter = (type: string) => async (req: { auth: IAuth }) => {
  if (!LIMIT_RULES[type]) {
    throw new InvalidRateLimitType(type);
  }

  if (isRateLimited(req.auth.userID, type)) {
    throw new RateLimitExceeded();
  }
};
