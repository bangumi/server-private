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
   * 1 分钟 10 次
   */
  like: { limit: 10, durationMinutes: 1 },

  /**
   * 报告疑虑
   *
   * 1 分钟 3 次
   */
  report: { limit: 3, durationMinutes: 1 },

  /**
   * 创建小组话题和条目讨论
   *
   * 10 分钟 5 次
   */
  topic: { limit: 5, durationMinutes: 10 },

  /**
   * 回复小组话题和条目讨论
   *
   * 1 分钟 5 次
   */
  reply: { limit: 5, durationMinutes: 1 },

  /**
   * 发表 章节/角色/人物/目录/日志/时间线 吐槽
   *
   * 1 分钟 3 次
   */
  comment: { limit: 3, durationMinutes: 1 },

  /**
   * 添加/删除 好友/黑名单
   *
   * 1 分钟 3 次
   */
  relationship: { limit: 3, durationMinutes: 1 },
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
