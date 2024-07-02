import { DateTime } from 'luxon';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import * as entity from '@app/lib/orm/entity/index.ts';
import { AppDataSource, SubjectRepo, SubjectRevRepo } from '@app/lib/orm/index.ts';

import * as Subject from './index.ts';
import { SubjectType } from './index.ts';

describe('should update subject', () => {
  const subjectMock = vi.fn();
  const subjectFieldMock = vi.fn();
  const subjectRevMock = vi.fn();

  vi.spyOn(SubjectRepo, 'findOneByOrFail').mockResolvedValue({
    typeID: SubjectType.Anime,
  } as entity.Subject);

  vi.spyOn(AppDataSource, 'transaction')
    // @ts-expect-error test, ignore type error
    .mockImplementation(async <T = unknown>(fn: (t: any) => Promise<T>): Promise<T> => {
      return await fn({
        getRepository(t: unknown) {
          if (t === entity.Subject) {
            return { update: subjectMock };
          }

          if (t === entity.SubjectFields) {
            return { update: subjectFieldMock };
          }

          if (t == entity.SubjectRev) {
            return { insert: subjectRevMock };
          }

          throw new Error('unexpected entity');
        },
      });
    });

  beforeEach(async () => {
    await SubjectRevRepo.delete({ subjectID: 363612 });
  });

  test('should update subject', async () => {
    const now = DateTime.now();

    await Subject.edit({
      subjectID: 363612,
      name: 'q',
      infobox: '{{Infobox q }}',
      summary: 'summary summary 2',
      userID: 2,
      platform: 3,
      date: '1997-11-11',
      commitMessage: 'cm',
      now,
    });

    expect(subjectRevMock).toBeCalledWith({
      commitMessage: 'cm',
      createdAt: now.toUnixInteger(),
      creatorID: 2,
      infobox: '{{Infobox q }}',
      name: 'q',
      nameCN: '',
      platform: 3,
      subjectID: 363612,
      summary: 'summary summary 2',
      typeID: SubjectType.Anime,
    });

    expect(subjectMock).toBeCalledWith(
      {
        id: 363612,
      },
      {
        fieldEps: 0,
        fieldInfobox: '{{Infobox q }}',
        fieldSummary: 'summary summary 2',
        name: 'q',
        nameCN: '',
        platform: 3,
        updatedAt: now.toUnixInteger(),
      },
    );

    expect(subjectFieldMock).toBeCalledWith(
      {
        subjectID: 363612,
      },
      {
        date: '1997-11-11',
        year: 1997,
        month: 11,
      },
    );
  });
});
