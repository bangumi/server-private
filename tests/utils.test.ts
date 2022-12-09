import { describe, expect, test } from 'vitest';

import { randomBase62String } from '../lib/utils';

describe('random should not have bias', () => {
  const step = 1000;
  const loop = 2000;
  const length = step * loop;

  const c: Record<string, number> = {};
  for (let i = 0; i < loop; i++) {
    const token = randomBase62String(step);
    expect(token).toHaveLength(step);
    for (const char of token) {
      c[char] = (c[char] ?? 0) + 1;
    }
  }

  expect(Object.keys(c).filter((x) => x !== undefined).length).toBe(62);

  for (const [key, count] of Object.entries(c)) {
    test(`character ${key}`, () => {
      expect(count).toBeGreaterThan((length / 62) * 0.95);
      expect(count).toBeLessThan((length / 62) * 1.05);
    });
  }
});
