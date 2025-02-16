import type { SubjectType } from '@app/lib/subject/type.ts';
import type { TrendingPeriod } from '@app/lib/trending/type.ts';

export function getTrendingSubjectKey(type: SubjectType, period: TrendingPeriod) {
  return `trending:subjects:${type}:${period}`;
}

export function getTrendingSubjectTopicKey(period: TrendingPeriod) {
  return `trending:topics:subjects:${period}`;
}
