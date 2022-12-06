import { describe, expect, test } from '@jest/globals';

import { comparePassword } from '../../lib/rest/api/login';

describe('compare password', () => {
  test('should pass', async () => {
    const hashed = '$2a$12$GA5Pr9GhsyLJcSPoTpYBY.JqTzYZb2nfgSeZ1EK38bfgk/Rykkvuq';
    const input = 'lovemeplease';
    await expect(comparePassword(hashed, input)).resolves.toBe(true);
  });

  test('should not pass', async () => {
    const hashed = '$2a$12$GA5Pr9GhsyLJcSPoTpYBY.JqTzYZb2nfgSeZ1EK38bfgk/Rykkvuq';
    const input = 'lovemeplease1';
    await expect(comparePassword(hashed, input)).resolves.toBe(false);
  });
});
