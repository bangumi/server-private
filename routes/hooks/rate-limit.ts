import { createError } from '@fastify/error';

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
  durationMinutes: number;
  validate?: number;
  hibernate?: number;
}

const LIMIT_RULES: Record<LimitAction, LimitRule> = {
  app: { limit: 5, durationMinutes: 10 },
  blog: { limit: 3, durationMinutes: 30 },
  group: { limit: 3, durationMinutes: 30 },
  doujin: { limit: 3, durationMinutes: 30 },
  event: { limit: 1, durationMinutes: 60 },
  event_topics: { limit: 3, durationMinutes: 30 },
  club_topics: { limit: 1, durationMinutes: 30 },

  /**
   * 修改/添加收藏
   *
   * 1 分钟 3 次
   */
  subject: { limit: 3, durationMinutes: 1 },
  character: { limit: 3, durationMinutes: 1 },
  person: { limit: 3, durationMinutes: 1 },
  index: { limit: 3, durationMinutes: 1 },

  /**
   * 更新章节进度
   *
   * 10 分钟 10 次
   */
  episode: { limit: 10, durationMinutes: 10 },

  /**
   * 发送时间线吐槽
   *
   * 1 分钟 3 次
   */
  timeline: { limit: 3, durationMinutes: 1 },

  /**
   * 点赞
   *
   * 1 分钟 5 次
   */
  like: { limit: 5, durationMinutes: 1 },

  crt_post: { limit: 1, durationMinutes: 1, validate: 7, hibernate: 5 },
  prsn_post: { limit: 1, durationMinutes: 1, validate: 7, hibernate: 5 },
  comment: { limit: 1, durationMinutes: 1, validate: 7, hibernate: 5 },
  relationship: { limit: 2, durationMinutes: 1, validate: 7, hibernate: 5 },
};

const limiter = createLimiter();

export const rateLimit = async (action: LimitAction, userID: number) => {
  const rule = LIMIT_RULES[action];
  if (!rule) {
    throw new InvalidRateLimitType(action);
  }
  const result = await limiter.userAction(userID, action, rule.durationMinutes * 60, rule.limit);
  if (result.limited) {
    throw new RateLimitExceeded();
  }
};
