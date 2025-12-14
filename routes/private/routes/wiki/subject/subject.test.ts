import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import { StatusCodes } from 'http-status-codes';
import { DateTime } from 'luxon';
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';

import { db, op, schema } from '@app/drizzle';
import { UserGroup } from '@app/lib/auth/index.ts';
import { projectRoot } from '@app/lib/config.ts';
import * as image from '@app/lib/image/index.ts';
import { SubjectRepo } from '@app/lib/orm/index.ts';
import type { IImaginary, Info } from '@app/lib/services/imaginary.ts';
import * as Subject from '@app/lib/subject/index.ts';
import { SubjectType } from '@app/lib/subject/index.ts';
import type { Permission } from '@app/lib/user/perm.ts';
import type { ISubjectEdit, ISubjectNew } from '@app/routes/private/routes/wiki/subject/index.ts';
import { setup } from '@app/routes/private/routes/wiki/subject/index.ts';
import { createTestServer } from '@app/tests/utils.ts';

async function testApp(...args: Parameters<typeof createTestServer>) {
  const app = createTestServer(...args);
  await app.register(setup);
  return app;
}

const newSubjectApp = () =>
  testApp({
    auth: {
      groupID: UserGroup.Normal,
      login: true,
      permission: { subject_edit: true },
      allowNsfw: true,
      regTime: 0,
      userID: 100,
    },
  });

describe('create subject', () => {
  test('create new subject', async () => {
    const app = await newSubjectApp();
    const res = await app.inject({
      url: '/subjects',
      method: 'post',
      payload: {
        name: 'New Subject',
        infobox: `{{Infobox
        | 话数 = 10
        }}`,
        type: SubjectType.Anime,
        platform: 0,
        metaTags: ['WEB', '3D'],
        summary: 'A brief summary of the subject',
        nsfw: false,
      } satisfies ISubjectNew,
    });

    expect(res.statusCode).toBe(200);

    expect(res.json()).toEqual({
      subjectID: expect.any(Number),
    });
  });

  test('create type', async () => {
    const app = await newSubjectApp();
    const res = await app.inject({
      url: '/subjects',
      method: 'post',
      payload: {
        name: 'New Subject',
        infobox: `{{Infobox
        | 话数 = 10
        }}`,
        type: 0,
        platform: 0,
        metaTags: ['WEB', '3D'],
        summary: 'A brief summary of the subject',
        nsfw: false,
      },
    });

    expect(res.statusCode).toBe(StatusCodes.BAD_REQUEST);

    expect(res.json()).toMatchInlineSnapshot(`
      Object {
        "code": "REQUEST_VALIDATION_ERROR",
        "error": "Bad Request",
        "message": "body/type must be equal to one of the allowed values",
        "statusCode": 400,
      }
    `);
  });

  test('invalid platform', async () => {
    const app = await newSubjectApp();
    const res = await app.inject({
      url: '/subjects',
      method: 'post',
      payload: {
        name: 'New Subject',
        infobox: `{{Infobox
        | 话数 = 10
        }}`,
        type: SubjectType.Anime,
        platform: 777777888,
        metaTags: ['WEB', '3D'],
        summary: 'A brief summary of the subject',
        nsfw: false,
      },
    });

    expect(res.statusCode).toBe(StatusCodes.BAD_REQUEST);

    expect(res.json()).toMatchInlineSnapshot(`
      Object {
        "code": "BAD_REQUEST",
        "error": "Bad Request",
        "message": "条目分类错误",
        "statusCode": 400,
      }
    `);
  });
});

describe('edit subject ', () => {
  const editSubject = vi.fn();

  beforeEach(() => {
    vi.spyOn(Subject, 'edit').mockImplementation(editSubject);
  });

  afterEach(() => {
    editSubject.mockReset();
  });

  test('should get current wiki info', async () => {
    const app = await testApp({});

    const res = await app.inject('/subjects/8');

    expect(res.json()).toMatchSnapshot();
  });

  test('should get subject revision wiki info', async () => {
    const app = await testApp({});

    const res = await app.inject('/subjects/-/revisions/551942');

    expect(res.json()).toMatchSnapshot();
  });

  test('should get edit history', async () => {
    const app = createTestServer({});
    await app.register(setup);

    const res = await app.inject('/subjects/8/history-summary');

    expect(res.json()).toMatchSnapshot();
  });

  test('should get user edit history', async () => {
    const app = createTestServer({});
    await app.register(setup);

    const res = await app.inject('/users/1/contributions/subjects');

    expect(res.json()).toMatchSnapshot();
  });

  test('should need authorization', async () => {
    const payload = {
      subject: {
        name: 'n',
        infobox: 'i',
        platform: 0,
        summary: 's',
        date: '0000-00-00',
        nsfw: false,
        metaTags: [],
      } satisfies ISubjectEdit,
      commitMessage: 'c',
    };
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
      url: '/subjects/1',
      method: 'put',
      payload,
    });

    expect(res.json()).toMatchInlineSnapshot(`
      Object {
        "code": "NOT_ALLOWED",
        "error": "Forbidden",
        "message": "you don't have permission to edit subject",
        "statusCode": 403,
      }
    `);
    expect(res.statusCode).toBe(403);
  });

  test('should update subject', async () => {
    const payload = {
      subject: {
        name: 'n',
        infobox: 'i',
        platform: 0,
        metaTags: [],
        summary: 's',
        date: '0000-00-00',
        nsfw: false,
      } satisfies ISubjectEdit,
      commitMessage: 'c',
    };
    const app = await testApp({
      auth: {
        groupID: UserGroup.Normal,
        login: true,
        permission: { subject_edit: true },
        allowNsfw: true,
        regTime: 0,
        userID: 100,
      },
    });

    const res = await app.inject({
      url: '/subjects/1',
      method: 'put',
      payload,
    });

    expect(res.statusCode).toBe(200);
    expect(editSubject).toBeCalledWith({
      commitMessage: 'c',
      infobox: 'i',
      name: 'n',
      platform: 0,
      subjectID: 1,
      now: expect.any(DateTime),
      date: '0000-00-00',
      nsfw: false,
      metaTags: [],
      summary: 's',
      userID: 100,
    });
  });
});

describe('should upload image', () => {
  const uploadImageMock = vi.fn();

  vi.spyOn(image, 'uploadSubjectImage').mockImplementation(uploadImageMock);
  vi.spyOn(Subject, 'uploadCover').mockImplementation(() => Promise.resolve());

  afterEach(() => {
    uploadImageMock.mockReset();
  });

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

  test('upload subject cover', async () => {
    const app = await testApp({
      auth: {
        groupID: UserGroup.Normal,
        login: true,
        permission: { subject_edit: true },
        allowNsfw: true,
        regTime: 0,
        userID: 100,
      },
    });

    const res = await app.inject({
      url: '/subjects/184017/covers',
      method: 'post',
      payload: {
        content: Buffer.from('hello world').toString('base64'),
      },
    });

    expect(res.json()).toMatchInlineSnapshot(`
      Object {
        "code": "ERR_NOT_IMAGE",
        "error": "Bad Request",
        "message": "invalid image file",
        "statusCode": 400,
      }
    `);
    expect(res.statusCode).toBe(400);
  });

  test.each(['jpg', 'webp'])('upload subject covers in %s format', async (format) => {
    const app = await testApp({
      auth: {
        groupID: UserGroup.Normal,
        login: true,
        permission: { subject_edit: true },
        allowNsfw: true,
        regTime: 0,
        userID: 100,
      },
    });

    const raw = await fs.readFile(path.join(projectRoot, `lib/image/fixtures/subject.${format}`));

    const res = await app.inject({
      url: '/subjects/184017/covers',
      method: 'post',
      payload: {
        content: raw.toString('base64'),
      },
    });

    expect(res.statusCode).toBe(200);
    expect(uploadImageMock).toBeCalledWith(
      expect.stringMatching(/.*\.jpe?g$/),
      expect.objectContaining({}),
    );
  });
});

const lockSubjectApp = () =>
  testApp({
    auth: {
      groupID: UserGroup.Normal,
      login: true,
      permission: { subject_edit: true, subject_lock: true } as Permission,
      allowNsfw: true,
      regTime: 0,
      userID: 100,
    },
  });

describe('lock subject', () => {
  const subjectID = 12;
  test('lock subject', async () => {
    const app = await lockSubjectApp();
    const res = await app.inject({
      url: '/lock/subjects',
      method: 'post',
      payload: {
        reason: 'string',
        subjectID: subjectID,
      },
    });

    expect(res.json()).toMatchInlineSnapshot(`Object {}`);
    expect(res.statusCode).toBe(200);

    const subject = await SubjectRepo.findOneBy({ id: subjectID });
    expect(subject?.subjectBan).toBe(1);
  });

  test('unlock subject', async () => {
    const app = await lockSubjectApp();
    const res = await app.inject({
      url: '/unlock/subjects',
      method: 'post',
      payload: {
        reason: 'string',
        subjectID: subjectID,
      },
    });

    expect(res.json()).toMatchInlineSnapshot(`Object {}`);
    expect(res.statusCode).toBe(200);

    const subject = await SubjectRepo.findOneBy({ id: subjectID });
    expect(subject?.subjectBan).toBe(0);
  });
});

const newEpisodeApp = () =>
  testApp({
    auth: {
      groupID: UserGroup.Normal,
      login: true,
      permission: { ep_edit: true },
      allowNsfw: true,
      regTime: 0,
      userID: 100,
    },
  });

describe('create episodes', () => {
  const subjectID = 13;

  test('create new episodes', async () => {
    await db.delete(schema.chiiEpisodes).where(op.eq(schema.chiiEpisodes.subjectID, subjectID));
    const app = await newEpisodeApp();
    const res = await app.inject({
      url: `/subjects/${subjectID}/ep`,
      method: 'post',
      payload: {
        episodes: [
          {
            name: 'Episode 1',
            nameCN: '第一话',
            type: 0,
            ep: 1,
            duration: '24:00',
            date: '2024-01-01',
            summary: 'First episode summary',
          },
          {
            ep: 2,
          },
        ],
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      episodeIDs: expect.arrayContaining([expect.any(Number), expect.any(Number)]),
    });
  });

  test('should require login', async () => {
    const app = await testApp({});
    const res = await app.inject({
      url: `/subjects/${subjectID}/ep`,
      method: 'post',
      payload: {
        episodes: [{ ep: 1 }],
      },
    });

    expect(res.statusCode).toBe(401);
  });

  test('should require ep_edit permission', async () => {
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
      url: `/subjects/${subjectID}/ep`,
      method: 'post',
      payload: {
        episodes: [{ ep: 1 }],
      },
    });

    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({
      code: 'NOT_ALLOWED',
      message: expect.stringContaining('create episodes'),
    });
  });

  test('should handle non-existent subject', async () => {
    const app = await newEpisodeApp();
    const res = await app.inject({
      url: '/subjects/999999/ep',
      method: 'post',
      payload: {
        episodes: [{ ep: 1 }],
      },
    });

    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({
      code: 'NOT_FOUND',
      message: expect.stringContaining('subject 999999'),
    });
  });
});

const patchEpisodesApp = () =>
  testApp({
    auth: {
      groupID: UserGroup.Normal,
      login: true,
      permission: { ep_edit: true },
      allowNsfw: true,
      regTime: 0,
      userID: 100,
    },
  });

describe('patch episodes', () => {
  const subjectID = 13;
  let episodeIDs: number[];

  beforeAll(async () => {
    const episodes = await db
      .select()
      .from(schema.chiiEpisodes)
      .where(op.eq(schema.chiiEpisodes.subjectID, subjectID))
      .orderBy(schema.chiiEpisodes.sort);
    episodeIDs = episodes.map((ep) => ep.id);
    expect(episodeIDs).toHaveLength(2);
  });

  test('successfully patch episodes', async () => {
    const app = await patchEpisodesApp();
    const res = await app.inject({
      url: `/subjects/${subjectID}/ep`,
      method: 'patch',
      payload: {
        commitMessage: 'Update episodes',
        episodes: [
          {
            id: episodeIDs[0],
            name: 'Updated Episode 1',
            nameCN: '更新第一话',
            duration: '25:00',
            date: '2024-01-02',
            summary: 'Updated summary',
          },
          {
            id: episodeIDs[1],
            name: 'In fact, Episode 3',
            ep: 3,
          },
        ],
      },
    });

    expect(res.statusCode).toBe(200);
  });

  test('should require login', async () => {
    const app = await testApp({});
    const res = await app.inject({
      url: `/subjects/${subjectID}/ep`,
      method: 'patch',
      payload: {
        commitMessage: 'Update episodes',
        episodes: [{ id: episodeIDs[0], name: 'New Name' }],
      },
    });

    expect(res.statusCode).toBe(401);
  });

  test('should require ep_edit permission', async () => {
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
      url: `/subjects/${subjectID}/ep`,
      method: 'patch',
      payload: {
        commitMessage: 'Update episodes',
        episodes: [{ id: episodeIDs[0], name: 'New Name' }],
      },
    });

    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({
      code: 'NOT_ALLOWED',
      message: expect.stringContaining('edit episodes'),
    });
  });

  test('should handle non-existent subject', async () => {
    const app = await patchEpisodesApp();
    const res = await app.inject({
      url: '/subjects/999999/ep',
      method: 'patch',
      payload: {
        commitMessage: 'Update episodes',
        episodes: [{ id: episodeIDs[0], name: 'New Name' }],
      },
    });

    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({
      code: 'NOT_FOUND',
      message: expect.stringContaining('subject 999999'),
    });
  });

  test('should reject empty episodes array', async () => {
    const app = await patchEpisodesApp();
    const res = await app.inject({
      url: `/subjects/${subjectID}/ep`,
      method: 'patch',
      payload: {
        commitMessage: 'Update episodes',
        episodes: [],
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({
      code: 'BAD_REQUEST',
      message: expect.stringContaining('no episodes to edit'),
    });
  });

  test('should reject mismatched expected revision length', async () => {
    const app = await patchEpisodesApp();
    const res = await app.inject({
      url: `/subjects/${subjectID}/ep`,
      method: 'patch',
      payload: {
        commitMessage: 'Update episodes',
        episodes: [{ id: episodeIDs[0], name: 'New Name' }],
        expectedRevision: [{ name: 'Old Name' }, { name: 'Extra Revision' }],
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({
      code: 'BAD_REQUEST',
      message: expect.stringContaining('expected revision length'),
    });
  });

  test('should reject duplicate episode IDs', async () => {
    const app = await patchEpisodesApp();
    const res = await app.inject({
      url: `/subjects/${subjectID}/ep`,
      method: 'patch',
      payload: {
        commitMessage: 'Update episodes',
        episodes: [
          { id: episodeIDs[0], name: 'New Name 1' },
          { id: episodeIDs[0], name: 'New Name 2' },
        ],
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({
      code: 'BAD_REQUEST',
      message: expect.stringContaining('episode ids are not unique'),
    });
  });

  test('should reject episodes from different subject', async () => {
    const app = await patchEpisodesApp();
    const res = await app.inject({
      url: `/subjects/${subjectID + 1}/ep`,
      method: 'patch',
      payload: {
        commitMessage: 'Update episodes',
        episodes: [{ id: episodeIDs[0], name: 'New Name' }],
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({
      code: 'BAD_REQUEST',
      message: expect.stringContaining('not for subject'),
    });
  });
});
