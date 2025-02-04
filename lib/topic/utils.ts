import type * as orm from '@app/drizzle/orm.ts';
import { HotGroups } from '@app/lib/group/consts.ts';

export function scoredUpdateTime(timestamp: number, topic: orm.IGroupTopic): number {
  if (HotGroups.includes(topic.gid) && topic.replies > 0) {
    const createdAt = topic.createdAt;
    const createdHours = (timestamp - createdAt) / 3600;
    const gravity = 1.8;
    const baseScore = (Math.pow(createdHours + 0.1, gravity) / topic.replies) * 200;
    const scoredLastPost = Math.trunc(timestamp - baseScore);
    return Math.min(scoredLastPost, timestamp);
  }

  return timestamp;
}
