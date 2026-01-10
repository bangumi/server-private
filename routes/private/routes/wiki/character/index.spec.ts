import * as lo from 'lodash-es';
import { DateTime } from 'luxon';
import { describe, expect, test } from 'vitest';

import type { IAuth } from '@app/lib/auth/index.ts';
import { UserGroup } from '@app/lib/auth/index.ts';
import { createTestServer } from '@app/tests/utils.ts';

import { setup } from './index.ts';

async function testApp({ auth }: { auth?: Partial<IAuth> } = {}) {
  const app = createTestServer({
    auth: lo.assign(
      {
        login: true,
        allowNsfw: true,
        regTime: DateTime.now().toUnixInteger(),
        userID: 1,
        groupID: UserGroup.Admin,
        permission: { subject_edit: true, mono_edit: true },
      },
      auth ?? {},
    ),
  });

  await app.register(setup);

  return app;
}

describe('edit character ', () => {
  test('should get current wiki info', async () => {
    const app = await testApp({});

    const res = await app.inject('/characters/1');

    expect(res.json()).toMatchSnapshot();
  });
});

describe('view history ', () => {
  test('should get history', async () => {
    const app = await testApp({});

    const res = await app.inject('/characters/1/history-summary');

    expect(res.json()).toMatchSnapshot();
  });

  test('should get revision', async () => {
    const app = await testApp({});

    const res = await app.inject('/characters/-/revisions/1198747');

    expect(res.json()).toMatchSnapshot();
  });

  test('should get user contribution', async () => {
    const app = await testApp({});

    const res = await app.inject('/users/1/contributions/characters');

    expect(res.json()).toMatchSnapshot();
  });
});
