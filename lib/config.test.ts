import { expect, test } from 'vitest';

import { testing } from './config';

test('should be in test env', () => {
  expect(testing).toBe(true);
});
