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
   * 5 分钟 15 次
   */
  Subject: { action: 'subject', limit: 15, durationMinutes: 5 },

  /**
   * 修改/添加角色收藏
   *
   * 5 分钟 15 次
   */
  Character: { action: 'character', limit: 15, durationMinutes: 5 },

  /**
   * 修改/添加人物收藏
   *
   * 5 分钟 15 次
   */
  Person: { action: 'person', limit: 15, durationMinutes: 5 },

  /**
   * 修改/添加目录收藏
   *
   * 5 分钟 10 次
   */
  Index: { action: 'index', limit: 10, durationMinutes: 5 },

  /**
   * 创建/更新用户自己的目录内容
   *
   * 5 分钟 15 次
   */
  IndexEdit: { action: 'index-edit', limit: 15, durationMinutes: 5 },

  /**
   * 更新章节进度
   *
   * 5 分钟 10 次
   */
  Episode: { action: 'episode', limit: 10, durationMinutes: 5 },

  /**
   * 发送时间线吐槽
   *
   * 5 分钟 5 次
   */
  Timeline: { action: 'timeline', limit: 5, durationMinutes: 5 },

  /**
   * 点赞
   *
   * 1 分钟 10 次
   */
  Like: { action: 'like', limit: 10, durationMinutes: 1 },

  /**
   * 报告疑虑
   *
   * 5 分钟 5 次
   */
  Report: { action: 'report', limit: 5, durationMinutes: 5 },

  /**
   * 发表 章节/角色/人物/目录/日志/时间线 吐槽
   *
   * 5 分钟 15 次
   */
  Comment: { action: 'comment', limit: 15, durationMinutes: 5 },

  /**
   * 创建小组话题和条目讨论
   *
   * 10 分钟 2 次
   */
  Topic: { action: 'topic', limit: 2, durationMinutes: 10 },

  /**
   * 回复小组话题和条目讨论
   *
   * 5 分钟 15 次
   */
  Reply: { action: 'reply', limit: 15, durationMinutes: 5 },

  /**
   * 添加/删除 好友/黑名单
   *
   * 5 分钟 10 次
   */
  Relationship: { action: 'relationship', limit: 10, durationMinutes: 5 },

  /**
   * 更新用户自己的设置或轻量状态
   *
   * 5 分钟 10 次
   */
  User: { action: 'user', limit: 10, durationMinutes: 5 },

  /**
   * 创建或更新 Wiki 内容
   *
   * 5 分钟 10 次
   */
  Wiki: { action: 'wiki', limit: 10, durationMinutes: 5 },
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
