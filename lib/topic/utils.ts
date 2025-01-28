import type * as orm from '@app/drizzle/orm.ts';
import { HotGroups } from '@app/lib/group/consts.ts';

export function scoredUpdateTime(timestamp: number, topic: orm.IGroupTopic): number {
  if (HotGroups.includes(topic.gid) && topic.replies > 0) {
    const $created_at = topic.createdAt;
    const $created_hours = (timestamp - $created_at) / 3600;
    const $gravity = 1.8;
    const $base_score = (Math.pow($created_hours + 0.1, $gravity) / topic.replies) * 200;
    const $scored_last_post = Math.trunc(timestamp - $base_score);
    return Math.min($scored_last_post, timestamp);
  }

  return timestamp;
}
