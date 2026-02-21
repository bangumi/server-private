import * as lo from 'lodash-es';
import { DateTime } from 'luxon';
import { describe, expect, test } from 'vitest';

import type { IAuth } from '@app/lib/auth/index.ts';
import { UserGroup } from '@app/lib/auth/index.ts';
import type * as res from '@app/lib/types/res.ts';
import type { IPagedUserPersonContribution } from '@app/routes/private/routes/wiki/person/index.ts';
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

describe('edit person ', () => {
  test('should get current wiki info', async () => {
    const app = await testApp({});

    const res = await app.inject('/persons/8');

    expect(res.json()).toMatchInlineSnapshot(`
      Object {
        "id": 8,
        "infobox": "{{Infobox Crt
      |简体中文名= 渡边英俊
      |别名={
      [渡邊英俊]
      [第二中文名|]
      [英文名|]
      [日文名|渡辺英俊]
      [纯假名|]
      [罗马字|Watanabe Hidetoshi]
      [昵称|]
      }
      |性别= 男
      |生日=
      |血型=
      |身高=
      |体重=
      |BWH=
      |引用来源={
      }
      }}",
        "name": "渡辺英俊",
        "profession": Object {
          "producer": true,
        },
        "summary": "",
        "typeID": 1,
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
      url: '/persons/1',
      method: 'PATCH',
      payload: {
        person: {
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
        "message": "you don't have permission to edit person",
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
      url: '/persons/1',
      method: 'PATCH',
      payload: {
        person: {
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
        "message": "you don't have permission to edit person",
        "statusCode": 403,
      }
    `);
    expect(res.statusCode).toBe(403);
  });

  test('should update person and history', async () => {
    const app = await testApp();

    const res = await app.inject({
      url: '/persons/3214',
      method: 'PATCH',
      payload: {
        person: {
          name: 'n',
          infobox: 'i',
          summary: 's',
        },
        commitMessage: 'c',
      },
    });

    expect(res.json()).toMatchInlineSnapshot(`Object {}`);
    expect(res.statusCode).toBe(200);

    const afterEdit = await app.inject('/persons/3214');
    expect(afterEdit.json()).toMatchInlineSnapshot(`
      Object {
        "id": 3214,
        "infobox": "i",
        "name": "n",
        "profession": Object {
          "producer": true,
        },
        "summary": "s",
        "typeID": 1,
      }
    `);

    const history = await app.inject('/persons/3214/history-summary');
    const contribution = await app.inject('/users/1/contributions/persons');

    const revisionRes: res.IPagedRevisionHistory = history.json();
    const revisionID = revisionRes.data[0]?.id;

    const contributionRes: IPagedUserPersonContribution = contribution.json();
    const contributionID = contributionRes.data[0]?.id;

    expect(revisionID).toBe(contributionID);

    const revision = await app.inject(`/persons/-/revisions/${revisionID}`);
    expect(revision.json()).toMatchInlineSnapshot(`
      Object {
        "extra": Object {
          "img": "89/d4/3214_prsn_anidb.jpg",
        },
        "infobox": "i",
        "name": "n",
        "profession": Object {
          "producer": true,
        },
        "summary": "s",
      }
    `);
  });

  test('should expected current person', async () => {
    const app = await testApp();

    const res = await app.inject({
      url: '/persons/1',
      method: 'PATCH',
      payload: {
        person: {
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
      +水樹奈々
      ",
        "statusCode": 400,
      }
    `);
    expect(res.statusCode).toBe(400);
  });
});

describe('person relations', () => {
  test('should get person character relation revision wiki info', async () => {
    const app = await testApp({});

    const res = await app.inject('/persons/-/casts/revisions/5909');

    expect(res.json()).toMatchSnapshot();
  });

  test('should get person character relation history', async () => {
    const app = createTestServer({});
    await app.register(setup);

    const res = await app.inject('/persons/1/casts/history-summary');

    expect(res.json()).toMatchSnapshot();
  });

  test('should get person subject revision wiki info', async () => {
    const app = await testApp({});

    const res = await app.inject('/persons/-/subjects/revisions/70822');

    expect(res.json()).toMatchSnapshot();
  });

  test('should get person subject relation history', async () => {
    const app = createTestServer({});
    await app.register(setup);

    const res = await app.inject('/persons/1/subjects/history-summary');

    expect(res.json()).toMatchSnapshot();
  });
});
