import { expect, test } from 'vitest';

import { createServer } from '@app/lib/server.ts';

function sortedStringify(obj: unknown): string {
  return JSON.stringify(
    obj,
    (_key: string, value: unknown) => {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        return Object.keys(value)
          .toSorted()
          .reduce<Record<string, unknown>>((sorted, key) => {
            sorted[key] = (value as Record<string, unknown>)[key];
            return sorted;
          }, {});
      }
      return value;
    },
    2,
  );
}

test('should build private api spec', async () => {
  const app = await createServer();

  const res = await app.inject({ url: '/p1/openapi.json' });
  expect(res.statusCode).toBe(200);

  const body = JSON.parse(res.body);
  expect(sortedStringify(body)).toMatchSnapshot();
}, 15000);
