import type { Wiki } from '@bgm38/wiki';
import { createError } from '@fastify/error';
import * as diff from 'diff';
import { StatusCodes } from 'http-status-codes';
import * as lo from 'lodash-es';

import { DATE } from '@app/lib/utils/date.ts';

export const WikiChangedError = createError<[string]>(
  'WIKI_CHANGED',
  "expected data doesn't match\n%s",
  StatusCodes.BAD_REQUEST,
);

export function matchExpected<
  E extends Record<string, string | string[] | null>,
  C extends Record<keyof E, string | string[]>,
>(expectedObject: E, currentObject: C) {
  for (const [key, expected] of Object.entries(expectedObject)) {
    if (expected === undefined || expected === null) {
      continue;
    }

    const current = currentObject[key as keyof E];

    if (!lo.isEqual(expected, current)) {
      throw new WikiChangedError(readableDiff(key, expected, current));
    }
  }
}

function readableDiff<T extends string | string[]>(name: string, expected: T, current: T): string {
  if (Array.isArray(expected)) {
    return diff.createPatch(
      name,
      expected.join('\n') + '\n',
      (current as string[]).join('\n') + '\n',
      'expected',
      'current',
    );
  }

  return diff.createPatch(name, `${expected}\n`, `${current}\n`, 'expected', 'current');
}

export function extractGender(wiki: Wiki): number {
  const raw = wiki.data.find(({ key }) => key === '性别')?.value;
  if (!raw) return 0;
  if (['男', '男性', '♂'].includes(raw)) {
    return 1;
  } else if (['女', '女性', '♀'].includes(raw)) {
    return 2;
  } else {
    return 0;
  }
}

export function extractBloodType(wiki: Wiki): number {
  const raw = wiki.data.find(({ key }) => key === '血型')?.value;
  if (!raw) return 0;
  if (['A', 'A型'].includes(raw)) {
    return 1;
  } else if (['B', 'B型'].includes(raw)) {
    return 2;
  } else if (['AB', 'AB型'].includes(raw)) {
    return 3;
  } else if (['O', 'O型'].includes(raw)) {
    return 4;
  } else {
    return 0;
  }
}

export function extractBirth(wiki: Wiki): DATE {
  const raw = wiki.data.find(({ key }) => key === '生日')?.value;
  if (!raw) return new DATE(0, 0, 0);
  const date = extractDateFromString(raw);
  if (!date) return new DATE(0, 0, 0);
  return date;
}

export function extractDateFromString(s: string): DATE | undefined {
  let year, month, day;

  for (const pattern of simple_patterns) {
    const m = pattern[Symbol.match](s);
    if (m?.groups) {
      year = m.groups.year;
      month = m.groups.month;
      day = m.groups.day;
    }
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
