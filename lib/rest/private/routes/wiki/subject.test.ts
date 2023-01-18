import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { UserGroup } from '@app/lib/auth';
import { projectRoot } from '@app/lib/config';
import * as image from '@app/lib/image';
import * as Subject from '@app/lib/subject';
import { createTestServer } from '@app/tests/utils';

import type { ISubjectEdit } from './subject';
import { setup } from './subject';

async function testApp(...args: Parameters<typeof createTestServer>) {
  const app = createTestServer(...args);
  await app.register(setup);
  return app;
}

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

  vi.spyOn(image, 'uploadImage').mockImplementation(uploadImageMock);
  vi.spyOn(Subject, 'uploadCover').mockImplementation(() => Promise.resolve());

  afterEach(() => {
    uploadImageMock.mockReset();
  });

  // only allow images in ./fixtures/
  vi.mock('@app/lib/services/imaginary', async () => {
    const mod = await vi.importActual<typeof import('@app/lib/services/imaginary')>(
      '@app/lib/services/imaginary',
    );

    const images = await Promise.all(
      ['webp', 'jpg'].map(async (ext) => {
        return {
          ext,
          content: await fs.readFile(
            path.join(projectRoot, `lib/rest/private/routes/wiki/fixtures/subject.${ext}`),
          ),
        };
      }),
    );

    expect(images).toHaveLength(2);

    return {
      default: {
        async info(img: Buffer) {
          const i = images.find((x) => x.content.equals(img));
          if (i) {
            return { type: i.ext };
          }
          throw new mod.NotValidImageError();
        },
      },
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
      url: '/subjects/1/cover',
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

    const raw = await fs.readFile(
      path.join(projectRoot, `lib/rest/private/routes/wiki/fixtures/subject.${format}`),
    );

    const res = await app.inject({
      url: '/subjects/1/cover',
      method: 'post',
      payload: {
        content: raw.toString('base64'),
      },
    });

    expect(res.statusCode).toBe(200);
    expect(uploadImageMock).toBeCalledWith(expect.stringMatching(new RegExp('\\.' + format)), raw);
  });
});
