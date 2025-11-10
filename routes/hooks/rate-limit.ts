import { createError } from '@fastify/error';

import type { LimitRule } from '@app/lib/utils/rate-limit';
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

const limiter = createLimiter();

export const rateLimit = async (rule: LimitRule, userID: number) => {
  const result = await limiter.userAction(
    userID,
    rule.action,
    rule.durationMinutes * 60,
    rule.limit,
  );
  if (result.limited) {
    throw new RateLimitExceeded();
  }
};
