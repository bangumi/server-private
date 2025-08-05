import { DateTime } from 'luxon';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { createTestServer } from '@app/tests/utils.ts';

import { setup } from './calendar.ts';

describe('calendar', () => {
  beforeEach(() => {
    vi.spyOn(DateTime, 'now').mockReturnValue(DateTime.fromSeconds(1020240000) as DateTime);
  });

  test('should get calendar', async () => {
    const app = createTestServer();
    await app.register(setup);
    const res = await app.inject({
      method: 'get',
      url: '/calendar',
    });
    expect(res.json()).toMatchSnapshot();
  });
});
