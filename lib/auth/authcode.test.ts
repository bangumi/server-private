import { expect, test } from 'vitest';

import { decode } from '@app/lib/auth/authcode.ts';

test('should decode', () => {
  const secretKey = 'testing-key-unsafe-to-use-in-production';

  expect(decode('Uh/B5TnaFQvC1z13opA6', secretKey)).toBe('abcdefg');
});
