import type { TrendingPeriod } from '@app/lib/trending/type.ts';

export function getTrendingSubjectKey(type: number, period: TrendingPeriod) {
  return `trending:subjects:${type}:${period}`;
}

export function getTrendingSubjectTopicKey(period: TrendingPeriod) {
  return `trending:topics:subjects:${period}`;
}
