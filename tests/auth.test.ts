import { describe, test, expect } from '@jest/globals';

import * as auth from '../lib/auth';

describe('should auth', () => {
  test('current auth', async () => {
    const user = await auth.byToken('a_development_access_token');
    expect(user.permission.report).toBe(true);
    expect(user.user?.groupID).toBe(10);

    const cached = await auth.byToken('a_development_access_token');
    expect(cached.permission.report).toBe(true);
    expect(cached.user?.groupID).toBe(10);
  });
});
