import { describe, test, expect } from 'vitest';

import * as auth from '@app/lib/auth';

describe('should auth', () => {
  test('current auth', async () => {
    const a = await auth.byToken('a_development_access_token');
    expect(a?.permission.report).toBe(true);

    const cached = await auth.byToken('a_development_access_token');
    expect(cached?.permission.report).toBe(true);
    expect(cached).toMatchObject({ groupID: 10 });
  });
});
