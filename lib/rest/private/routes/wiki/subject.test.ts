import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { UserGroup } from '@app/lib/auth';
import * as Subject from '@app/lib/subject';
import { createTestServer } from '@app/tests/utils';

import { setup } from './subject';
import type { ISubjectEdit } from './subject';

describe('edit subject ', () => {
  const editSubject = vi.fn();

  beforeEach(() => {
    vi.spyOn(Subject, 'edit').mockImplementation(editSubject);
  });

  afterEach(() => {
    editSubject.mockReset();
  });

  test('should get current wiki info', async () => {
    const app = createTestServer({});
    await app.register(setup);

    const res = await app.inject('/subjects/8');

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
      } satisfies ISubjectEdit,
      commitMessage: 'c',
    };
    const app = createTestServer({
      auth: {
        groupID: UserGroup.Normal,
        login: true,
        permission: {},
        allowNsfw: true,
        userID: 100,
      },
    });

    await app.register(setup);

    const res = await app.inject({
      url: '/subjects/1',
      method: 'put',
      payload,
    });

    expect(res.json()).toMatchInlineSnapshot(`
      Object {
        "code": "NEED_LOGIN",
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
      } satisfies ISubjectEdit,
      commitMessage: 'c',
    };
    const app = createTestServer({
      auth: {
        groupID: UserGroup.Normal,
        login: true,
        permission: { subject_edit: true },
        allowNsfw: true,
        userID: 100,
      },
    });

    await app.register(setup);

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
      summary: 's',
      userID: 100,
    });
  });
});
