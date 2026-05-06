import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import * as lo from 'lodash-es';
import { DateTime } from 'luxon';
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';

import type { IAuth } from '@app/lib/auth/index.ts';
import { UserGroup } from '@app/lib/auth/index.ts';
import { projectRoot } from '@app/lib/config.ts';
import * as image from '@app/lib/image/index.ts';
import type { IImaginary, Info } from '@app/lib/services/imaginary.ts';
import type * as res from '@app/lib/types/res.ts';
import type { IPagedUserCharacterContribution } from '@app/routes/private/routes/wiki/character/index.ts';
import { createTestServer } from '@app/tests/utils.ts';

import { setup } from './index.ts';

// only allow images in ./fixtures/
vi.mock('@app/lib/services/imaginary', async () => {
  const mod = await vi.importActual<typeof import('@app/lib/services/imaginary.ts')>(
    '@app/lib/services/imaginary',
  );

  const images = await Promise.all(
    ['webp', 'jpg'].map(async (ext) => {
      return {
        ext,
        content: await fs.readFile(path.join(projectRoot, `lib/image/fixtures/subject.${ext}`)),
      };
    }),
  );

  expect(images).toHaveLength(2);

  return {
    default: {
      async info(img: Buffer) {
        const i = images.find((x) => x.content.equals(img));
        if (i) {
          return { type: i.ext } as Info;
        }
        throw new mod.NotValidImageError();
      },

      convert(): Promise<Buffer<ArrayBuffer>> {
        return Promise.resolve(Buffer.from(''));
      },
    } satisfies IImaginary,
  };
});

beforeAll(async () => {
  await fs.rm('./tmp', { recursive: true, force: true });
});

afterAll(async () => {
  await fs.rm('./tmp', { recursive: true, force: true });
});

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

describe('create character', () => {
  test('should create character and history', async () => {
    const app = await testApp();

    const uploadImageMock = vi.fn();
    vi.spyOn(image, 'uploadMonoImage').mockImplementationOnce(uploadImageMock);

    const raw = await fs.readFile(path.join(projectRoot, 'lib/image/fixtures/subject.jpg'));

    const res = await app.inject({
      url: '/characters',
      method: 'POST',
      payload: {
        character: {
          name: 'New Character',
          type: 1,
          infobox: `{{Infobox Crt
|简体中文名= 新角色
|性别= 女
|生日= 1995年3月10日
|血型= B
}}`,
          summary: 'A new character summary',
          img: raw.toString('base64'),
        },
      },
    });

    expect(res.statusCode).toBe(200);
    const characterRes = res.json();
    expect(characterRes.characterID).toBeDefined();

    expect(uploadImageMock).toHaveBeenCalledWith(
      expect.stringMatching(/.*\.jpe?g$/),
      expect.any(Buffer),
    );

    const history = await app.inject(`/characters/${characterRes.characterID}/history-summary`);
    const revisionID = history.json().data[0]?.id;
    expect(revisionID).toBeDefined();

    const revision = await app.inject(`/characters/-/revisions/${revisionID}`);
    expect(revision.statusCode).toBe(200);

    const revisionData: res.ICharacterRevisionWikiInfo = revision.json();
    expect(revisionData.name).toBe('New Character');
    expect(revisionData.summary).toBe('A new character summary');
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

    const raw = await fs.readFile(path.join(projectRoot, 'lib/image/fixtures/subject.jpg'));

    const res = await app.inject({
      url: '/characters',
      method: 'POST',
      payload: {
        character: {
          name: 'New Character',
          type: 1,
          infobox: '{{Infobox}}',
          summary: 'A new character summary',
          img: raw.toString('base64'),
        },
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

  test('should validate type', async () => {
    const app = await testApp();

    const res = await app.inject({
      url: '/characters',
      method: 'POST',
      payload: {
        character: {
          name: 'New Character',
          type: 999, // invalid type
          infobox: '{{Infobox}}',
          summary: 'A new character summary',
        },
      },
    });

    expect(res.statusCode).toBe(400);
  });
});

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
        "locked": false,
        "name": "坂上智代",
        "redirect": 0,
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
          infobox: '{{Infobox}}',
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
      url: '/characters/10',
      method: 'PATCH',
      payload: {
        character: {
          name: 'n',
          infobox: `{{Infobox
|生日= 1月20日
|性别= 男
|血型= O
}}`,
          summary: 's',
        },
        commitMessage: 'c',
      },
    });

    expect(res.statusCode).toBe(200);

    const afterEdit = await app.inject('/characters/10');
    expect(afterEdit.json()).toMatchInlineSnapshot(`
      Object {
        "id": 10,
        "infobox": "{{Infobox
      |生日= 1月20日
      |性别= 男
      |血型= O
      }}",
        "locked": false,
        "name": "n",
        "redirect": 0,
        "summary": "s",
      }
    `);

    const history = await app.inject('/characters/10/history-summary');
    const contribution = await app.inject('/users/1/contributions/characters');

    const revisionRes: res.IPagedRevisionHistory = history.json();
    const revisionID = revisionRes.data[0]?.id;

    const contributionRes: IPagedUserCharacterContribution = contribution.json();
    const contributionID = contributionRes.data[0]?.id;

    expect(revisionID).toBe(contributionID);

    const revision = await app.inject(`/characters/-/revisions/${revisionID}`);
    expect(revision.statusCode).toBe(200);
    const revisionData: res.ICharacterRevisionWikiInfo = revision.json();
    expect(revisionData.infobox).toBe(`{{Infobox
|生日= 1月20日
|性别= 男
|血型= O
}}`);
    expect(revisionData.name).toBe('n');
    expect(revisionData.summary).toBe('s');
  });

  test('should upload character image and create revision', async () => {
    const app = await testApp();

    const uploadImageMock = vi.fn();
    vi.spyOn(image, 'uploadMonoImage').mockImplementationOnce(uploadImageMock);

    const raw = await fs.readFile(path.join(projectRoot, 'lib/image/fixtures/subject.jpg'));

    const res = await app.inject({
      url: '/characters/40/potraits',
      method: 'POST',
      payload: {
        img: raw.toString('base64'),
      },
    });

    expect(res.statusCode).toBe(200);
    const imageRes = res.json();
    expect(imageRes.img).toMatch(/^raw(?:\/\w{2}){2}\/40_crt_.*\.jpe?g$/);

    expect(uploadImageMock).toHaveBeenCalledWith(
      expect.stringMatching(/.*\.jpe?g$/),
      expect.any(Buffer),
    );

    const history = await app.inject('/characters/40/history-summary');
    const revisionID = history.json().data[0]?.id;
    expect(revisionID).toBeDefined();

    const revision = await app.inject(`/characters/-/revisions/${revisionID}`);
    expect(revision.statusCode).toBe(200);

    const revisionData: res.ICharacterRevisionWikiInfo = revision.json();
    expect(revisionData.extra?.img).toBe(imageRes.img);
  });

  test('should expected current character', async () => {
    const app = await testApp();

    const res = await app.inject({
      url: '/characters/1',
      method: 'PATCH',
      payload: {
        character: {
          name: 'n',
          infobox: '{{Infobox}}',
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

    const res = await app.inject('/characters/-/subjects/revisions/838999');

    expect(res.json()).toMatchSnapshot();
  });

  test('should get character subject relation history', async () => {
    const app = createTestServer({});
    await app.register(setup);

    const res = await app.inject('/characters/1/subjects/history-summary');

    expect(res.json()).toMatchSnapshot();
  });
});
