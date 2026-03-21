import * as lo from 'lodash-es';
import { DateTime } from 'luxon';
import { describe, expect, test, vi } from 'vitest';

import { db } from '@app/drizzle';
import type { IAuth } from '@app/lib/auth/index.ts';
import { UserGroup } from '@app/lib/auth/index.ts';
import type * as res from '@app/lib/types/res.ts';
import type { IPagedUserPersonContribution } from '@app/routes/private/routes/wiki/person/index.ts';
import { setup as setupSubject } from '@app/routes/private/routes/wiki/subject/index.ts';
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
        "locked": false,
        "name": "渡辺英俊",
        "profession": Object {
          "producer": true,
        },
        "redirect": 0,
        "summary": "",
        "typeID": 1,
      }
    `);
  });

  test('should return locked person info', async () => {
    const app = await testApp({});
    const limit = vi.fn().mockResolvedValue([
      {
        id: 65425,
        name: '一花',
        type: 1,
        infobox: 'i',
        summary: 's',
        ban: 1,
        lock: 0,
        redirect: 0,
        producer: 0,
        mangaka: 0,
        artist: 1,
        seiyu: 0,
        writer: 0,
        illustrator: 0,
        actor: 0,
      },
    ]);
    const selectSpy = vi.spyOn(db, 'select').mockReturnValue({
      from: () => ({
        where: () => ({
          limit,
        }),
      }),
    } as never);

    const res = await app.inject('/persons/65425');

    selectSpy.mockRestore();

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      id: 65425,
      name: '一花',
      typeID: 1,
      infobox: 'i',
      summary: 's',
      locked: true,
      redirect: 0,
      profession: {
        artist: true,
      },
    });
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
        "locked": false,
        "name": "n",
        "profession": Object {
          "producer": true,
        },
        "redirect": 0,
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

test('should update person-subject relations', async () => {
  const payload = {
    commitMessage: 'update relations',
    relations: [
      {
        subject: {
          id: 22267,
          name: '星界の戦旗',
          nameCN: '星界的战旗',
        },
        position: 2001,
        appearEps: '1-2',
      },
      {
        subject: {
          id: 10,
        },
        position: 2002,
      },
    ],
  };
  const app = await testApp();

  const res = await app.inject({
    url: '/persons/9/subjects?type=1',
    method: 'put',
    payload,
  });

  expect(res.statusCode).toBe(200);
  const afterEdit = await app.inject('/persons/9/subjects?type=1');
  expect(afterEdit.json()).toMatchSnapshot();

  const subjectApp = createTestServer();
  await subjectApp.register(setupSubject);

  const afterDeleteReverse = await subjectApp.inject('/subjects/22273/persons');
  expect(afterDeleteReverse.json()).toMatchSnapshot();

  const afterEditReverse = await subjectApp.inject('/subjects/22267/persons');
  expect(afterEditReverse.json()).toMatchSnapshot();

  const afterAddReverse = await subjectApp.inject('/subjects/10/persons');
  expect(afterAddReverse.json()).toMatchSnapshot();
});

test('should handle invalid subject relation type', async () => {
  const payload = {
    commitMessage: 'update relations',
    relations: [
      {
        subject: {
          id: 10,
        },
        position: 3001,
      },
    ],
  };
  const app = await testApp();

  const res = await app.inject({
    url: '/persons/9/subjects?type=1',
    method: 'put',
    payload,
  });

  expect(res.statusCode).toBe(400);
  expect(res.json()).toMatchInlineSnapshot(`
    Object {
      "code": "BAD_REQUEST",
      "error": "Bad Request",
      "message": "position 3001 is not valid",
      "statusCode": 400,
    }
  `);
});

test('should handle wrong subject type', async () => {
  const payload = {
    commitMessage: 'update relations',
    relations: [
      {
        subject: {
          id: 7,
        },
        position: 2002,
      },
    ],
  };
  const app = await testApp();

  const res = await app.inject({
    url: '/persons/9/subjects?type=1',
    method: 'put',
    payload,
  });

  expect(res.statusCode).toBe(400);
  expect(res.json()).toMatchInlineSnapshot(`
    Object {
      "code": "BAD_REQUEST",
      "error": "Bad Request",
      "message": "related subject 7 type not match",
      "statusCode": 400,
    }
  `);
});

describe('person relations', () => {
  test('should get person character relation revision wiki info', async () => {
    const app = await testApp();

    const res = await app.inject('/persons/-/casts/revisions/5909');

    expect(res.json()).toMatchSnapshot();
  });

  test('should get person character relation history', async () => {
    const app = await testApp();

    const res = await app.inject('/persons/1/casts/history-summary');

    expect(res.json()).toMatchSnapshot();
  });

  test('should get person subject revision wiki info', async () => {
    const app = await testApp();

    const res = await app.inject('/persons/-/subjects/revisions/70822');

    expect(res.json()).toMatchSnapshot();
  });

  test('should get person subject relation history', async () => {
    const app = await testApp();

    const res = await app.inject('/persons/1/subjects/history-summary');

    expect(res.json()).toMatchSnapshot();
  });
});
