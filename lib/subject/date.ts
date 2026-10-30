import { parse, type Wiki } from '@bgm38/wiki';

import { DATE } from '@app/lib/utils/date.ts';
import { getSubjectPlatformSortKeys } from '@app/vendor';

/** 从条目 infobox 解析日期，解析失败或日期不可用时返回 undefined（调用方不应清空已有日期） */
export function resolveSubjectDate(
  infobox: string,
  typeID: number,
  platform: number,
): DATE | undefined {
  let w: Wiki;
  try {
    w = parse(infobox);
  } catch {
    return;
  }

  const date = extractDate(w, typeID, platform);
  if (date.year <= 1900) {
    return;
  }

  return date;
}

export function extractDate(w: Wiki, typeID: number, platform: number): DATE {
  const keys = getSubjectPlatformSortKeys(typeID, platform);

  const values = keys
    .map((key) => {
      return w.data.find((v) => v.key === key);
    })
    .filter((v) => v !== undefined);

  for (const item of values) {
    if (!item) {
      continue;
    }
    if (item.value) {
      const parsed = extractFromString(item.value);
      if (parsed) {
        return parsed;
      }
    }

    for (const value of item.values ?? []) {
      if (!value.v) {
        continue;
      }

      const parsed = extractFromString(value.v);
      if (parsed) {
        return parsed;
      }
    }
  }

  return new DATE(0, 0, 0);
}

export function extractFromString(s: string): DATE | undefined {
  let year, month, day;

  for (const pattern of simple_patterns) {
    const m = pattern[Symbol.match](s);
    if (!m?.groups) {
      continue;
    }

    year = m.groups.year;
    month = m.groups.month;
    day = m.groups.day;
  }

  if (!year) {
    return;
  }

  return new DATE(
    Number.parseInt(year),
    month ? Number.parseInt(month) : 0,
    day ? Number.parseInt(day) : 0,
  );
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
  /^(?<year>\d{4})年(?:(?<month>\d{1,2})月)?(?:(?<day>\d{1,2})日)?/, // YYYY年(MM月)?(DD日)?
];

const simple_dash_patterns = [
  new RegExp(String.raw`(^|[^\d])\d{4}-\d{2}-\d{2}$`), // YYYY-MM-DD"
  new RegExp(String.raw`^\d{4}-\d{2}-\d{2}([^\d]|[ (（]|$)`), // YYYY-MM-DD ***
  new RegExp(String.raw`\(\d{4}-\d{2}-\d{2}\)$`), // (YYYY-MM-DD)
  new RegExp(String.raw`（\d{4}-\d{2}-\d{2}）$`), // （YYYY-MM-DD）
];
