import { DateTime } from 'luxon';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { emptyAuth } from '@app/lib/auth/index.ts';
import { createTestServer } from '@app/tests/utils.ts';

import { setup as calendarSetup } from './calendar.ts';
import { setup } from './home.ts';

describe('home', () => {
  beforeEach(() => {
    vi.spyOn(DateTime, 'now').mockReturnValue(DateTime.fromSeconds(1020240000) as DateTime<true>);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('should return public blocks when not logged in', async () => {
    const app = createTestServer();
    await app.register(calendarSetup);
    await app.register(setup);

    const res = await app.inject({
      method: 'get',
      url: '/home',
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      progress: [],
      timeline: [],
      groupTopics: [],
    });
    expect(res.json()).toMatchSnapshot();
  });

  test('should get home data', async () => {
    const app = createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        userID: 287622,
      },
    });
    await app.register(calendarSetup);
    await app.register(setup);

    const res = await app.inject({
      method: 'get',
      url: '/home',
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchSnapshot();
  });
});
