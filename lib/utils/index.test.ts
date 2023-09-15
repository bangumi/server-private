import pLimit from 'p-limit';
import { expect, test } from 'vitest';

import { formatDuration, intval, parseDuration, randomBase62String, randomBytes } from './index.ts';

const limit = pLimit(10);

test('random should not have bias', async () => {
  const step = 4000;
  const loop = 2000;
  const length = step * loop;

  const c: Record<string, number> = {};

  await Promise.all(
    Array.from({ length: loop }).map(() =>
      limit(async () => {
        const token = await randomBase62String(step);
        expect(token).toHaveLength(step);
        for (const char of token) {
          c[char] = (c[char] ?? 0) + 1;
        }
      }),
    ),
  );

  expect(Object.keys(c).length).toBe(62);

  for (const [key, count] of Object.entries(c)) {
    test(`character ${key}`, () => {
      expect(count).toBeGreaterThan((length / 62) * 0.98);
      expect(count).toBeLessThan((length / 62) * 1.02);
    });
  }
});

test.each([
  ['0', 0],
  ['0x8', 8],
  ['1', 1],
  ['1eb', undefined],
  ['1.9', undefined],
  ['1.99', undefined],
  [1.99, undefined],
  ['-100', -100],
])('intval(%j) === %j', (value, expected) => {
  if (expected === undefined) {
    expect(() => intval(value)).toThrow();
  } else {
    expect(intval(value)).toBe(expected);
  }
});

test('randomBytes', async () => {
  const bytes = await randomBytes(20);

  expect(bytes).toHaveLength(20);
});

test.each([
  ['20:3', 20 * 60 + 3],
  ['00:50:10', 50 * 60 + 10],
  ['30m2s', 30 * 60 + 2],
  ['1h20m8s', 60 * 60 + 20 * 60 + 8],
  ['not duration string', Number.NaN],
])('parseDuration(%j) === %j', function (value, expected) {
  expect(parseDuration(value)).toBe(expected);
});

test.each([
  [20 * 60 + 3, '20:03'],
  [3 * 60 * 60 + 22 * 60 + 3, '3:22:03'],
])('formatDuration(%j) === %j', function (value, expected) {
  expect(formatDuration(value)).toBe(expected);
});
