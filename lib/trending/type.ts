export interface TrendingItem {
  id: number;
  total: number;
}

export enum TrendingPeriod {
  All = 'all',
  Day = 'day',
  Week = 'week',
  Month = 'month',
}

export function getTrendingPeriodDuration(period: TrendingPeriod): number {
  const now = Date.now();
  const duration = {
    all: now,
    day: 86400,
    week: 86400 * 7,
    month: 86400 * 30,
  }[period];
  return duration;
}
