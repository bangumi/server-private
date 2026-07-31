import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { db, op, schema } from '@app/drizzle';
import { emptyAuth, UserGroup } from '@app/lib/auth/index.ts';
import * as image from '@app/lib/image/index.ts';
import * as Subject from '@app/lib/subject/index.ts';
import { createTestServer } from '@app/tests/utils.ts';

import { setup } from './index.ts';

const testImageID = 910001;
const testSubjectID = 990001;
const testUserID = 987005;

const deleteSubjectImageMock = vi
  .spyOn(image, 'deleteSubjectImage')
  .mockImplementation(() => Promise.resolve());
const onSubjectVoteMock = vi.spyOn(Subject, 'onSubjectVote').mockImplementation(() => {
  return Promise.resolve();
});

async function deleteTestImage() {
  await db.delete(schema.chiiSubjectImgs).where(op.eq(schema.chiiSubjectImgs.imgId, testImageID));
}

describe('admin covers', () => {
  beforeEach(async () => {
    await deleteTestImage();
    deleteSubjectImageMock.mockClear();
    onSubjectVoteMock.mockClear();
    await db.insert(schema.chiiSubjectImgs).values({
      imgId: testImageID,
      imgBan: 0,
      imgTarget: 'testing admin target',
      imgSubjectId: testSubjectID,
      imgUid: testUserID,
      imgVote: 0,
      imgNsfw: false,
      imgDateline: Math.floor(Date.now() / 1000),
    });
  });

  afterEach(deleteTestImage);

  test('should delete subject cover', async () => {
    const app = createTestServer({
      auth: {
        ...emptyAuth(),
        login: true,
        groupID: UserGroup.BangumiAdmin,
        userID: testUserID,
        permission: { subject_cover_erase: true },
      },
    });
    await app.register(setup);

    const res = await app.inject({
      method: 'delete',
      url: `/subject/${testSubjectID}/covers`,
      body: {
        imageID: testImageID,
      },
    });

    expect(res.statusCode).toBe(200);
    expect(deleteSubjectImageMock).toHaveBeenCalledWith('testing admin target');
    expect(onSubjectVoteMock).toHaveBeenCalledWith(testSubjectID);

    const [imageRow] = await db
      .select()
      .from(schema.chiiSubjectImgs)
      .where(op.eq(schema.chiiSubjectImgs.imgId, testImageID))
      .limit(1);
    expect(imageRow?.imgBan).toBe(1);
  });
});
