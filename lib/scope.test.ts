import { expect, test } from 'vitest';

import { decodeStoredScope, encodeStoredScope } from './scope.ts';

test('uses a Go-compatible object when persisting granted scopes', () => {
  for (const raw of [
    'read:collection',
    '["read:collection"]',
    '{"read:collection":true,"write:collection":false}',
  ]) {
    expect(encodeStoredScope(decodeStoredScope(raw) ?? [])).toBe('{"read:collection":true}');
  }
  expect(decodeStoredScope(null)).toBeNull();
  expect(decodeStoredScope('{}')).toEqual([]);
});
