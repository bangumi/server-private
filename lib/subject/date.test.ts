import { test, expect } from 'vitest';

import { extractFromString } from 'app/lib/subject/date';

test.each([
  ['', '0000-00-00'],
  ['2020年1月3日', '2020-01-03'],
  ['2017-12-22(2018年1月5日・12日合併号)', '2017-12-22'],
])('extractFromString(%s) -> %s', (input, expected) => {
  expect(extractFromString(input)).toBe(expected);
});
