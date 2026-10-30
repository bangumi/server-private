import { beforeEach, describe, expect, it } from 'vitest';

import { db, op, schema } from '@app/drizzle';
import { EpisodeCollectionStatus } from '@app/lib/subject/type';

import { getEpStatus, markEpisodesAsWatched, updateSubjectEpisodeProgress } from './ep.ts';

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
  });

  it('should handle empty episode list', async () => {
    await db.transaction(async (t) => {
      const watchedCount = await markEpisodesAsWatched(t, testUserID, testSubjectID, []);
      expect(watchedCount).toBe(0);
    });

    const status = await getEpStatus(testUserID, testSubjectID);
    expect(status.size).toBe(0);
  });

  it('should remove the episode entry on revoke', async () => {
    await db.transaction(async (t) => {
      await updateSubjectEpisodeProgress(
        t,
        testUserID,
        testSubjectID,
        1027,
        EpisodeCollectionStatus.Done,
      );
      await updateSubjectEpisodeProgress(
        t,
        testUserID,
        testSubjectID,
        1028,
        EpisodeCollectionStatus.Wish,
      );
    });

    await db.transaction(async (t) => {
      const watchedCount = await updateSubjectEpisodeProgress(
        t,
        testUserID,
        testSubjectID,
        1027,
        EpisodeCollectionStatus.None,
      );
      expect(watchedCount).toBe(0);
    });

    const status = await getEpStatus(testUserID, testSubjectID);
    expect(status.size).toBe(1);
    expect(status.get(1027)).toBeUndefined();
    expect(status.get(1028)?.type).toBe(EpisodeCollectionStatus.Wish);
  });

  it('should delete the row when the last episode entry is revoked', async () => {
    await db.transaction(async (t) => {
      await updateSubjectEpisodeProgress(
        t,
        testUserID,
        testSubjectID,
        1027,
        EpisodeCollectionStatus.Done,
      );
    });
    await db.transaction(async (t) => {
      await updateSubjectEpisodeProgress(
        t,
        testUserID,
        testSubjectID,
        1027,
        EpisodeCollectionStatus.None,
      );
    });

    const status = await getEpStatus(testUserID, testSubjectID);
    expect(status.size).toBe(0);

    const rows = await db
      .select()
      .from(schema.chiiEpStatus)
      .where(
        op.and(
          op.eq(schema.chiiEpStatus.uid, testUserID),
          op.eq(schema.chiiEpStatus.sid, testSubjectID),
        ),
      );
    expect(rows).toHaveLength(0);
  });

  it('should not create a row when revoking without existing status', async () => {
    await db.transaction(async (t) => {
      const watchedCount = await updateSubjectEpisodeProgress(
        t,
        testUserID,
        testSubjectID,
        1027,
        EpisodeCollectionStatus.None,
      );
      expect(watchedCount).toBe(0);
    });

    const rows = await db
      .select()
      .from(schema.chiiEpStatus)
      .where(
        op.and(
          op.eq(schema.chiiEpStatus.uid, testUserID),
          op.eq(schema.chiiEpStatus.sid, testSubjectID),
        ),
      );
    expect(rows).toHaveLength(0);
  });
});
