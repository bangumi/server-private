import { stage } from '@app/lib/config.ts';
import redis from '@app/lib/redis.ts';
import { RedisLimiter } from '@app/lib/utils/rate-limit/redis.ts';

export const enum LimitAction {
  App = 'app',
  Ep = 'ep',
  Blog = 'blog',
  Index = 'index',
  Group = 'group',
  Doujin = 'doujin',
  Event = 'event',
  EventTopics = 'event_topics',
  Subject = 'subject',
  ClubTopics = 'club_topics',
  CrtPost = 'crt_post',
  PrsnPost = 'prsn_post',
  Like = 'like',
}

export interface Result {
  limited: boolean;

  remain: number;
  reset: number;
  limit: number;
}

export interface Limiter {
  get(key: string, timeWindow: number, limit: number): Promise<Result>;

  userAction(
    userID: number,
    action: LimitAction,
    timeWindow: number,
    limit: number,
  ): Promise<Result>;

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
