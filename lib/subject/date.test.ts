import type { Wiki } from '@bgm38/wiki';
import { parse } from '@bgm38/wiki';
import { expect, test } from 'vitest';

import { extractDate, extractFromString } from '@app/lib/subject/date';

test.each([
  ['', '0000-00-00'],
  ['2020年1月3日', '2020-01-03'],
  ['2017-12-22(2018年1月5日・12日合併号)', '2017-12-22'],
])('extractFromString(%s) -> %s', (input, expected) => {
  expect(extractFromString(input)).toBe(expected);
});

test.each([
  [parse(`{{Infobox}}`), '0000-00-00'],
  [
    parse(`{{Infobox
|放送开始=1887-07-01
}}`),
    '1887-07-01',
  ],
])('extractDate(%s) = %s', (w: Wiki, date: string) => {
  expect(extractDate(w)).toBe(date);
});
