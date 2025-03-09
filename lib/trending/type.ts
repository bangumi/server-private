import { DateTime } from 'luxon';

export interface TrendingItem {
  id: number;
  total: number;
}

export const TrendingPeriod = Object.freeze({
  All: 'all',
  Day: 'day',
  Week: 'week',
  Month: 'month',
});
export type TrendingPeriod = (typeof TrendingPeriod)[keyof typeof TrendingPeriod];

export function getTrendingDateline(period: TrendingPeriod): number {
  const now = DateTime.now().toUnixInteger();
  const duration = {
    all: now,
    day: 86400,
    week: 86400 * 7,
    month: 86400 * 30,
  }[period];
  if (duration === undefined) {
    return 0;
  }
  return now - duration;
}
