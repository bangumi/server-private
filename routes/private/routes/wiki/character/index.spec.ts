import * as lo from 'lodash-es';
import { DateTime } from 'luxon';
import { describe, expect, test } from 'vitest';

import type { IAuth } from '@app/lib/auth/index.ts';
import { UserGroup } from '@app/lib/auth/index.ts';
import type * as res from '@app/lib/types/res.ts';
import type { IPagedUserCharacterContribution } from '@app/routes/private/routes/wiki/character/index.ts';
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

    const res = await app.inject('/characters/8');

    expect(res.json()).toMatchInlineSnapshot(`
      Object {
        "id": 8,
        "infobox": "{{Infobox Crt
      |简体中文名= 坂上智代
      |别名={
      [第二中文名|]
      [英文名|]
      [日文名|]
      [纯假名|さかがみともよ]
      [罗马字|Sakagami Tomoyo]
      [昵称|]
      }
      |性别= 女
      |生日= 10月14日
      |血型= O
      |身高= 161cm
      |体重= 47kg
      |BWH= 86/57/82
      |引用来源={
      }
      |声优=
      }}",
        "name": "坂上智代",
        "summary": "朋也的后辈……虽说应当是如此，说起话来的口气却像是个前辈一样。她待人很好，又有领导才能，因此在她的身边很自然地就聚集起了许多人。她的目标是成为学生会的会长，但这却成为了她与朋也之间的鸿沟……",
      }
    `);
  });

  test('should need authorization', async () => {
    const app = await testApp({
      auth: {
        groupID: UserGroup.Normal,
        login: true,
        permission: {},
        allowNsfw: true,
        regTime: 0,
        userID: 100,
      },
    });

    const res = await app.inject({
      url: '/characters/1',
      method: 'PATCH',
      payload: {
        character: {
          name: 'n',
          infobox: 'i',
          summary: 's',
        },
        commitMessage: 'c',
      },
    });

    expect(res.json()).toMatchInlineSnapshot(`
      Object {
        "code": "NOT_ALLOWED",
        "error": "Forbidden",
        "message": "you don't have permission to edit character",
        "statusCode": 403,
      }
    `);
    expect(res.statusCode).toBe(403);
  });

  test('should need authorization', async () => {
    const app = await testApp({
      auth: {
        groupID: UserGroup.Normal,
        login: true,
        permission: {},
        allowNsfw: true,
        regTime: 0,
        userID: 100,
      },
    });

    const res = await app.inject({
      url: '/characters/1',
      method: 'PATCH',
      payload: {
        character: {
          name: 'n',
          infobox: 'i',
          summary: 's',
        },
        commitMessage: 'c',
      },
    });

    expect(res.json()).toMatchInlineSnapshot(`
      Object {
        "code": "NOT_ALLOWED",
        "error": "Forbidden",
        "message": "you don't have permission to edit character",
        "statusCode": 403,
      }
    `);
    expect(res.statusCode).toBe(403);
  });

  test('should update character and history', async () => {
    const app = await testApp();

    const res = await app.inject({
      url: '/characters/40',
      method: 'PATCH',
      payload: {
        character: {
          name: 'n',
          infobox: 'i',
          summary: 's',
        },
        commitMessage: 'c',
      },
    });

    expect(res.json()).toMatchInlineSnapshot(`Object {}`);
    expect(res.statusCode).toBe(200);

    const afterEdit = await app.inject('/characters/40');
    expect(afterEdit.json()).toMatchInlineSnapshot(`
      Object {
        "id": 40,
        "infobox": "i",
        "name": "n",
        "summary": "s",
      }
    `);

    const history = await app.inject('/characters/40/history-summary');
    const contribution = await app.inject('/users/1/contributions/characters');

    const revisionRes: res.IPagedRevisionHistory = history.json();
    const revisionID = revisionRes.data[0]?.id;

    const contributionRes: IPagedUserCharacterContribution = contribution.json();
    const contributionID = contributionRes.data[0]?.id;

    expect(revisionID).toBe(contributionID);

    const revision = await app.inject(`/characters/-/revisions/${revisionID}`);
    expect(revision.json()).toMatchInlineSnapshot(`
      Object {
        "extra": Object {
          "img": "d6/45/40_20e395fedad7bbbed0eca3fe2e0_nRIwK.jpg",
        },
        "infobox": "i",
        "name": "n",
        "summary": "s",
      }
    `);
  });

  test('should expected current character', async () => {
    const app = await testApp();

    const res = await app.inject({
      url: '/characters/1',
      method: 'PATCH',
      payload: {
        character: {
          name: 'n',
          infobox: 'i',
          summary: 's',
        },
        expectedRevision: {
          name: '1234',
        },
        commitMessage: 'c',
      },
    });

    expect(res.json()).toMatchInlineSnapshot(`
      Object {
        "code": "WIKI_CHANGED",
        "error": "Bad Request",
        "message": "expected data doesn't match
      Index: name
      ===================================================================
      --- name	expected
      +++ name	current
      @@ -1,1 +1,1 @@
      -1234
      +ルルーシュ・ランペルージ
      ",
        "statusCode": 400,
      }
    `);
    expect(res.statusCode).toBe(400);
  });
});

describe('character relations', () => {
  test('should get character person relation revision wiki info', async () => {
    const app = await testApp({});

    const res = await app.inject('/characters/-/casts/revisions/1015845');

    expect(res.json()).toMatchSnapshot();
  });

  test('should get character person relation history', async () => {
    const app = createTestServer({});
    await app.register(setup);

    const res = await app.inject('/characters/1/casts/history-summary');

    expect(res.json()).toMatchSnapshot();
  });

  test('should get character subject revision wiki info', async () => {
    const app = await testApp({});

    const res = await app.inject('/characters/-/subjects/revisions/1027816');

    expect(res.json()).toMatchSnapshot();
  });

  test('should get character subject relation history', async () => {
    const app = createTestServer({});
    await app.register(setup);

    const res = await app.inject('/characters/1/subjects/history-summary');

    expect(res.json()).toMatchSnapshot();
  });
});
