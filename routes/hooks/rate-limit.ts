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
  limitCount: number;
  durationMinutes: number;
  validate?: number;
  hibernate?: number;
}

const LIMIT_RULES: Record<LimitAction, LimitRule> = {
  app: { limitCount: 5, durationMinutes: 10 },
  ep: { limitCount: 10, durationMinutes: 10 },
  blog: { limitCount: 3, durationMinutes: 30 },
  index: { limitCount: 3, durationMinutes: 30 },
  group: { limitCount: 3, durationMinutes: 30 },
  doujin: { limitCount: 3, durationMinutes: 30 },
  event: { limitCount: 1, durationMinutes: 60 },
  event_topics: { limitCount: 3, durationMinutes: 30 },
  subject: { limitCount: 3, durationMinutes: 30 },
  club_topics: { limitCount: 1, durationMinutes: 30 },
  crt_post: { limitCount: 1, durationMinutes: 1, validate: 7, hibernate: 5 },
  prsn_post: { limitCount: 1, durationMinutes: 1, validate: 7, hibernate: 5 },
  like: { limitCount: 2, durationMinutes: 1 },
};

const limiter = createLimiter();

export const rateLimiter = (action: LimitAction) => async (req: { auth: IAuth }) => {
  const rule = LIMIT_RULES[action];
  if (!rule) {
    throw new InvalidRateLimitType(action);
  }
  const result = await limiter.userAction(
    req.auth.userID,
    action,
    rule.durationMinutes * 60,
    rule.limitCount,
  );
  if (result.limited) {
    throw new RateLimitExceeded();
  }
};
