import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import { StatusCodes } from 'http-status-codes';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { UserGroup } from '@app/lib/auth/index.ts';
import { projectRoot } from '@app/lib/config.ts';
import * as image from '@app/lib/image/index.ts';
import type { Permission } from '@app/lib/orm/index.ts';
import { SubjectRepo } from '@app/lib/orm/index.ts';
import type { IImaginary, Info } from '@app/lib/services/imaginary.ts';
import * as Subject from '@app/lib/subject/index.ts';
import { SubjectType } from '@app/lib/subject/index.ts';
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
        summary: 'A brief summary of the subject',
        nsfw: false,
      },
    });

    expect(res.statusCode).toBe(StatusCodes.BAD_REQUEST);

    expect(res.json()).toMatchInlineSnapshot(`
      Object {
        "code": "REQUEST_VALIDATION_ERROR",
        "error": "Bad Request",
        "message": "body/type must be equal to constant, body/type must be equal to constant, body/type must be equal to constant, body/type must be equal to constant, body/type must be equal to constant, body/type must match a schema in anyOf",
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

  test('should get edit history', async () => {
    const app = createTestServer({});
    await app.register(setup);

    const res = await app.inject('/subjects/8/history-summary');

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
        "error": "Unauthorized",
        "message": "you don't have permission to edit subject",
        "statusCode": 401,
      }
    `);
    expect(res.statusCode).toBe(401);
  });

  test('should update subject', async () => {
    const payload = {
      subject: {
        name: 'n',
        infobox: 'i',
        platform: 0,
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
      date: '0000-00-00',
      nsfw: false,
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

        convert(): Promise<Buffer> {
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
  test('lock subject', async () => {
    const app = await lockSubjectApp();
    const res = await app.inject({
      url: '/lock/subjects',
      method: 'post',
      payload: {
        reason: 'string',
        subjectID: 8,
      },
    });

    expect(res.json()).toMatchInlineSnapshot(`Object {}`);
    expect(res.statusCode).toBe(200);

    const subject = await SubjectRepo.findOneBy({ id: 8 });
    expect(subject?.subjectBan).toBe(1);
  });

  test('unlock subject', async () => {
    const app = await lockSubjectApp();
    const res = await app.inject({
      url: '/unlock/subjects',
      method: 'post',
      payload: {
        reason: 'string',
        subjectID: 8,
      },
    });

    expect(res.json()).toMatchInlineSnapshot(`Object {}`);
    expect(res.statusCode).toBe(200);

    const subject = await SubjectRepo.findOneBy({ id: 8 });
    expect(subject?.subjectBan).toBe(0);
  });
});
