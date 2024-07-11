/* eslint-disable @typescript-eslint/require-await */
import { createError } from '@fastify/error';

import type { IAuth } from '@app/lib/auth';
import type { LimitAction } from '@app/lib/utils/rate-limit';
import { createLimiter } from '@app/lib/utils/rate-limit';

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

interface LimitRule {
  limit: number;
  duration: number;
  validate?: number;
  hibernate?: number;
}

const LIMIT_RULES: Record<LimitAction, LimitRule> = {
  app: { limit: 5, duration: 10 },
  ep: { limit: 10, duration: 10 },
  blog: { limit: 3, duration: 30 },
  index: { limit: 3, duration: 30 },
  group: { limit: 3, duration: 30 },
  doujin: { limit: 3, duration: 30 },
  event: { limit: 1, duration: 60 },
  event_topics: { limit: 3, duration: 30 },
  subject: { limit: 3, duration: 30 },
  club_topics: { limit: 1, duration: 30 },
  crt_post: { limit: 1, duration: 1, validate: 7, hibernate: 5 },
  prsn_post: { limit: 1, duration: 1, validate: 7, hibernate: 5 },
  like: { limit: 2, duration: 1 },
};

const limiter = createLimiter();

export const rateLimiter = (action: LimitAction) => async (req: { auth: IAuth }) => {
  const rule = LIMIT_RULES[action];
  if (!rule) {
    throw new InvalidRateLimitType(action);
  }
  const result = await limiter.userAction(req.auth.userID, action, rule.duration * 60, rule.limit);
  if (result.limited) {
    throw new RateLimitExceeded();
  }
};
