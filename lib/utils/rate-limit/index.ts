import { stage } from '@app/lib/config.ts';
import redis from '@app/lib/redis.ts';
import { RedisLimiter } from '@app/lib/utils/rate-limit/redis.ts';

export interface LimitRule {
  action: string;
  limit: number;
  durationMinutes: number;
  validate?: number;
  hibernate?: number;
}

export const LimitAction = Object.freeze({
  /**
   * 修改/添加条目收藏
   *
   * 1 分钟 3 次
   */
  Subject: { action: 'subject', limit: 3, durationMinutes: 1 },

  /**
   * 修改/添加角色收藏
   *
   * 1 分钟 3 次
   */
  Character: { action: 'character', limit: 3, durationMinutes: 1 },

  /**
   * 修改/添加人物收藏
   *
   * 1 分钟 3 次
   */
  Person: { action: 'person', limit: 3, durationMinutes: 1 },

  /**
   * 修改/添加目录收藏
   *
   * 1 分钟 3 次
   */
  Index: { action: 'index', limit: 3, durationMinutes: 1 },

  /**
   * 更新章节进度
   *
   * 10 分钟 10 次
   */
  Episode: { action: 'episode', limit: 10, durationMinutes: 10 },

  /**
   * 发送时间线吐槽
   *
   * 1 分钟 3 次
   */
  Timeline: { action: 'timeline', limit: 3, durationMinutes: 1 },

  /**
   * 点赞
   *
   * 1 分钟 10 次
   */
  Like: { action: 'like', limit: 10, durationMinutes: 1 },

  /**
   * 报告疑虑
   *
   * 1 分钟 3 次
   */
  Report: { action: 'report', limit: 3, durationMinutes: 1 },

  /**
   * 发表 章节/角色/人物/目录/日志/时间线 吐槽
   *
   * 1 分钟 3 次
   */
  Comment: { action: 'comment', limit: 3, durationMinutes: 1 },

  /**
   * 创建小组话题和条目讨论
   *
   * 10 分钟 5 次
   */
  Topic: { action: 'topic', limit: 5, durationMinutes: 10 },

  /**
   * 回复小组话题和条目讨论
   *
   * 1 分钟 5 次
   */
  Reply: { action: 'reply', limit: 5, durationMinutes: 1 },

  /**
   * 添加/删除 好友/黑名单
   *
   * 1 分钟 3 次
   */
  Relationship: { action: 'relationship', limit: 3, durationMinutes: 1 },
} as const satisfies Record<string, LimitRule>);

export interface Result {
  limited: boolean;

  remain: number;
  reset: number;
  limit: number;
}

export interface Limiter {
  get(key: string, timeWindow: number, limit: number): Promise<Result>;

  userAction(userID: number, action: string, timeWindow: number, limit: number): Promise<Result>;

  reset(key: string): Promise<void>;
}

export function createLimiter(): Limiter {
  if (stage) {
    return {
      userAction(): Promise<Result> {
        return Promise.resolve({ limited: false, remain: 6, reset: 3600, limit: 10 });
      },

      get(): Promise<Result> {
        return Promise.resolve({ limited: false, remain: 6, reset: 3600, limit: 10 });
      },

      reset(): Promise<void> {
        return Promise.resolve();
      },
    };
  }

  return new RedisLimiter({
    redisClient: redis,
  });
}
