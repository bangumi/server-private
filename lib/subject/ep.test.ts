import { beforeEach, describe, expect, it } from 'vitest';

import { db, op, schema } from '@app/drizzle';
import { EpisodeCollectionStatus } from '@app/lib/subject/type';

import { getEpStatus, markEpisodesAsWatched } from './ep.ts';

describe('episode status', () => {
  const testUserID = 382951;
  const testSubjectID = 12;

  beforeEach(async () => {
    await db
      .delete(schema.chiiEpStatus)
      .where(
        op.and(
          op.eq(schema.chiiEpStatus.uid, testUserID),
          op.eq(schema.chiiEpStatus.sid, testSubjectID),
        ),
      );
  });

  it('should mark episodes as watched and verify status', async () => {
    await db.transaction(async (t) => {
      const watchedCount = await markEpisodesAsWatched(t, testUserID, testSubjectID, [1027, 1028]);
      expect(watchedCount).toBe(2);
    });

    // DEBUG:
    const [st] = await db
      .select()
      .from(schema.chiiEpStatus)
      .where(
        op.and(
          op.eq(schema.chiiEpStatus.uid, testUserID),
          op.eq(schema.chiiEpStatus.sid, testSubjectID),
        ),
      );
    expect(st).toBeDefined();
    expect(st?.status).toBe('check');

    const status = await getEpStatus(testUserID, testSubjectID);
    expect(status.size).toBe(2);

    for (const episodeID of [1027, 1028]) {
      const episodeStatus = status.get(episodeID);
      expect(episodeStatus).toBeDefined();
      expect(episodeStatus?.type).toBe(EpisodeCollectionStatus.Done);
      expect(episodeStatus?.eid).toBe(episodeID.toString());
    }
  });

  it('should handle marking episodes as watched with revertOthers', async () => {
    await db.transaction(async (t) => {
      await markEpisodesAsWatched(t, testUserID, testSubjectID, [1027, 1028]);
    });

    await db.transaction(async (t) => {
      const watchedCount = await markEpisodesAsWatched(
        t,
        testUserID,
        testSubjectID,
        [1029, 1030],
        true,
      );
      expect(watchedCount).toBe(2);
    });

    const status = await getEpStatus(testUserID, testSubjectID);
    expect(status.size).toBe(2);

    expect(status.get(1029)?.type).toBe(EpisodeCollectionStatus.Done);
    expect(status.get(1030)?.type).toBe(EpisodeCollectionStatus.Done);
    expect(status.get(1027)).toBeUndefined();
    expect(status.get(1028)).toBeUndefined();
  });

  it('should handle empty episode list', async () => {
    await db.transaction(async (t) => {
      const watchedCount = await markEpisodesAsWatched(t, testUserID, testSubjectID, []);
      expect(watchedCount).toBe(0);
    });

    const status = await getEpStatus(testUserID, testSubjectID);
    expect(status.size).toBe(0);
  });
});
