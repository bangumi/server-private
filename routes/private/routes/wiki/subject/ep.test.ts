import { DateTime } from 'luxon';
import { beforeEach, describe, expect, test } from 'vitest';

import { db, op, schema } from '@app/drizzle';
import { UserGroup } from '@app/lib/auth/index.ts';
import { createTestServer } from '@app/tests/utils.ts';

import { setup } from './ep.ts';

async function testApp(...args: Parameters<typeof createTestServer>) {
  const app = createTestServer(...args);
  await app.register(setup);
  return app;
}

describe('edit subject ', () => {
  beforeEach(async () => {
    await db
      .update(schema.chiiEpisodes)
      .set({ name: 'Beckoning (Genshin Impact Main Theme Var.)', nameCN: '情不自禁' })
      .where(op.eq(schema.chiiEpisodes.id, 980049));
  });

  test('should get current wiki info', async () => {
    const app = await testApp({});

    const res = await app.inject('/ep/8');

    expect(res.json()).toMatchInlineSnapshot(`
      Object {
        "date": "",
        "disc": 0,
        "duration": "",
        "ep": 6,
        "id": 8,
        "name": "蒼と白の境界線",
        "nameCN": "",
        "subjectID": 15,
        "summary": "",
        "type": 0,
      }
    `);
  });

  test('should update current wiki info', async () => {
    const app = await testApp({
      auth: {
        login: true,
        allowNsfw: true,
        regTime: DateTime.now().toUnixInteger(),
        userID: 1,
        groupID: UserGroup.BangumiAdmin,
        permission: { subject_edit: true, ep_edit: true },
      },
    });

    const res = await app.inject({
      url: '/ep/980049',
      method: 'PATCH',
      body: {
        commitMessage: 'example commit message',
        episode: {
          date: '2024-12-01',
          duration: '',
          name: '蒼と白の境界線',
          nameCN: '',
          subjectID: 15,
          summary: '',
        },
        expectedRevision: {
          name: 'Beckoning (Genshin Impact Main Theme Var.)',
          nameCN: '情不自禁',
        },
      },
    });

    expect(res.statusCode).toMatchInlineSnapshot(`200`);
    expect(res.json()).toMatchInlineSnapshot(`Object {}`);
  });
});
