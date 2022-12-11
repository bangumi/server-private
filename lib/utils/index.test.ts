import pLimit from 'p-limit';
import { expect, test } from 'vitest';

import { randomBase62String } from './index';

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
