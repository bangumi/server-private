import type { Wiki, WikiItem } from '@bgm38/wiki';

import { SubjectType } from './type';

const defaultKeys = Object.freeze(['放送开始', '发行日期', '开始']);

const keyConfig = {
  [SubjectType.Book]: Object.freeze(['发售日', '开始']),
  [SubjectType.Anime]: defaultKeys,
  [SubjectType.Music]: defaultKeys,
  [SubjectType.Game]: defaultKeys,
  [SubjectType.Real]: defaultKeys,
};

export function extractDate(w: Wiki, typeID: SubjectType): string {
  const keys = keyConfig[typeID] ?? defaultKeys;

  const values: WikiItem[] = keys
    .map((key) => {
      return w.data.find((v) => v.key === key);
    })
    .filter((v) => v !== undefined);

  for (const item of values) {
    if (item.value) {
      const parsed = extractFromString(item.value);
      if (parsed) {
        return parsed;
      }
    }
  }

  return '0000-00-00';
}

export function extractFromString(s: string): string | undefined {
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
    return;
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
