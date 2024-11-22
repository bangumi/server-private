import { SubjectTypeValues } from '@app/lib/subject/type.ts';
import { updateTrendingSubjects } from '@app/lib/trending/subject.ts';
import { TrendingPeriod } from '@app/lib/trending/type.ts';

export async function trendingSubjects() {
  for (const subjectType of SubjectTypeValues) {
    await updateTrendingSubjects(subjectType, TrendingPeriod.Month);
  }
}
