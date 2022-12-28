import type { Wiki } from 'app/lib/utils/wiki/types';

const dateKeys = new Set(['放送开始', '发行日期', '开始']);

export function extractDate(w: Wiki): string {
  const v = w.data.find((v) => {
    return dateKeys.has(v.key);
  });

  if (v?.value) {
    return extractFromString(v.value);
  }

  return '0000-00-00';
}

export function extractFromString(s: string): string {
  let year, month, day;

  for (const pattern of simple_patterns) {
    const m = pattern[Symbol.match](s);
    if (m?.groups) {
      year = m.groups.year;
      month = m.groups.month;
      day = m.groups.day;
    }
  }

  if (!year || !month || !day) {
    return '0000-00-00';
  }

  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

const simple_patterns = [
  /((?<year>\d{4})年(?<month>\d{1,2})月(?<day>\d{1,2})日)([^\d号発號]|$)/,
  /(^[^\d-])(?<year>\d{4})-(?<month>\d{1,2})-(?<day>\d{1,2})\)([^\d-]|$)/,
  /(^[^\d/])(?<year>\d{4})\/(?<month>\d{1,2})\/(?<day>\d{1,2})\)([^\d/]|$)/,
  /(^[^\d.])(?<year>\d{4})\.(?<month>\d{1,2})\.(?<day>\d{1,2})\)([^\d.万]|$)/,

  /\((?<year>\d{4})-(?<month>\d{1,2})-(?<day>\d{1,2})\)$/, // (YYYY-MM-DD)
  /（(?<year>\d{4})-(?<month>\d{1,2})-(?<day>\d{1,2})）$/, //（YYYY-MM-DD）
  /^(?<year>\d{4})-(?<month>\d{1,2})-(?<day>\d{1,2})$/, // YYYY-MM-DD"
  /^(?<year>\d{4})-(?<month>\d{1,2})-(?<day>\d{1,2})[ ([（].*$/, // YYYY-MM-DD...
  /^(?<year>\d{4})年(?<month>\d{1,2})月(?<day>\d{1,2})日/,
];

const simple_dash_patterns = [
  new RegExp(String.raw`(^|[^\d])\d{4}-\d{2}-\d{2}$`), // YYYY-MM-DD"
  new RegExp(String.raw`^\d{4}-\d{2}-\d{2}([^\d]|[ (（]|$)`), // YYYY-MM-DD ***
  new RegExp(String.raw`\(\d{4}-\d{2}-\d{2}\)$`), // (YYYY-MM-DD)
  new RegExp(String.raw`（\d{4}-\d{2}-\d{2}）$`), // （YYYY-MM-DD）
];
