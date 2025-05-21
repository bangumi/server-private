import { beforeEach, describe, expect, it } from 'vitest';

import { db, op, schema } from '@app/drizzle';
import { EpisodeCollectionStatus } from '@app/lib/subject/type';

import { getEpStatus, markEpisodesAsWatched } from './ep.ts';

describe('Episode Status Management', () => {
  const testUserID = 382951;
  const testSubjectID = 12;
  const testEpisodeIDs = [1027, 1028];

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
      const watchedCount = await markEpisodesAsWatched(
        t,
        testUserID,
        testSubjectID,
        testEpisodeIDs,
      );
      expect(watchedCount).toBe(testEpisodeIDs.length);
    });

    const status = await getEpStatus(testUserID, testSubjectID);
    expect(status.size).toBe(testEpisodeIDs.length);

    for (const episodeID of testEpisodeIDs) {
      const episodeStatus = status.get(episodeID);
      expect(episodeStatus).toBeDefined();
      expect(episodeStatus?.type).toBe(EpisodeCollectionStatus.Done);
      expect(episodeStatus?.eid).toBe(episodeID.toString());
    }
  });

  it('should handle marking episodes as watched with revertOthers', async () => {
    await db.transaction(async (t) => {
      await markEpisodesAsWatched(t, testUserID, testSubjectID, [1, 2]);
    });

    await db.transaction(async (t) => {
      const watchedCount = await markEpisodesAsWatched(t, testUserID, testSubjectID, [3, 4], true);
      expect(watchedCount).toBe(2);
    });

    const status = await getEpStatus(testUserID, testSubjectID);
    expect(status.size).toBe(2);

    expect(status.get(3)?.type).toBe(EpisodeCollectionStatus.Done);
    expect(status.get(4)?.type).toBe(EpisodeCollectionStatus.Done);
    expect(status.get(1)).toBeUndefined();
    expect(status.get(2)).toBeUndefined();
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
