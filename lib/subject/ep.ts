import { DateTime } from 'luxon';

import { db, op, schema, type Txn } from '@app/drizzle';
import { decode } from '@app/lib/utils';

import { type UserEpisodeStatusItem } from './type';
import { EpisodeCollectionStatus } from './type';

export function decodeSubjectEpStatus(status: string): Map<number, UserEpisodeStatusItem> {
  const result = new Map<number, UserEpisodeStatusItem>();
  if (!status) {
    return result;
  }
  const epStatusList = decode(status) as Record<number, UserEpisodeStatusItem>;
  for (const [eid, x] of Object.entries(epStatusList)) {
    result.set(Number(eid), x);
  }
  return result;
}

export function encodeSubjectEpStatus(status: Map<number, UserEpisodeStatusItem>): string {
  return JSON.stringify(Object.fromEntries(status));
}

export async function getEpStatus(
  userID: number,
  subjectID: number,
): Promise<Map<number, UserEpisodeStatusItem>> {
  const [data] = await db
    .select()
    .from(schema.chiiEpStatus)
    .where(
      op.and(op.eq(schema.chiiEpStatus.uid, userID), op.eq(schema.chiiEpStatus.sid, subjectID)),
    )
    .limit(1);
  if (!data) {
    return new Map();
  }
  return decodeSubjectEpStatus(data.status);
}

/** 标记条目剧集为已观看，需要在事务中执行 */
export async function markEpisodesAsWatched(
  t: Txn,
  userID: number,
  subjectID: number,
  episodeIDs: number[],
  revertOthers = false,
): Promise<number> {
  const now = DateTime.now().toUnixInteger();
  const [current] = await t
    .select()
    .from(schema.chiiEpStatus)
    .where(
      op.and(op.eq(schema.chiiEpStatus.uid, userID), op.eq(schema.chiiEpStatus.sid, subjectID)),
    );
  let watchedEpisodes = 0;
  if (current?.status) {
    const epStatusList = decodeSubjectEpStatus(current.status);
    if (revertOthers) {
      for (const [eid, x] of epStatusList) {
        if (episodeIDs.includes(eid) && x.type === EpisodeCollectionStatus.Done) {
          epStatusList.delete(eid);
        }
      }
    }
    for (const eid of episodeIDs) {
      const status: UserEpisodeStatusItem = {
        eid: eid.toString(),
        type: EpisodeCollectionStatus.Done,
        updated_at: {
          ...epStatusList.get(eid)?.updated_at,
          [EpisodeCollectionStatus.Done]: now,
        },
      };
      epStatusList.set(eid, status);
    }
    watchedEpisodes = [...epStatusList.values()].filter(
      (x) => x.type === EpisodeCollectionStatus.Done,
    ).length;
    const newStatus = encodeSubjectEpStatus(epStatusList);
    await t
      .update(schema.chiiEpStatus)
      .set({ status: newStatus, updatedAt: now })
      .where(op.eq(schema.chiiEpStatus.id, current.id))
      .limit(1);
  } else {
    const epStatusList = new Map<number, UserEpisodeStatusItem>();
    for (const episodeID of episodeIDs) {
      epStatusList.set(episodeID, {
        eid: episodeID.toString(),
        type: EpisodeCollectionStatus.Done,
        updated_at: { [EpisodeCollectionStatus.Done]: now },
      });
    }
    watchedEpisodes = [...epStatusList.values()].filter(
      (x) => x.type === EpisodeCollectionStatus.Done,
    ).length;
    const newStatus = encodeSubjectEpStatus(epStatusList);
    await t.insert(schema.chiiEpStatus).values({
      uid: userID,
      sid: subjectID,
      status: newStatus,
      updatedAt: now,
    });
  }
  return watchedEpisodes;
}

/** 更新条目剧集进度，需要在事务中执行 */
export async function updateSubjectEpisodeProgress(
  t: Txn,
  userID: number,
  subjectID: number,
  episodeID: number,
  type: number,
): Promise<number> {
  const now = DateTime.now().toUnixInteger();
  const [current] = await t
    .select()
    .from(schema.chiiEpStatus)
    .where(
      op.and(op.eq(schema.chiiEpStatus.uid, userID), op.eq(schema.chiiEpStatus.sid, subjectID)),
    );
  let watchedEpisodes = 0;
  if (current) {
    const epStatusList = decodeSubjectEpStatus(current.status);
    const status: UserEpisodeStatusItem = {
      eid: episodeID.toString(),
      type,
      updated_at: {
        ...epStatusList.get(episodeID)?.updated_at,
        [type]: now,
      },
    };
    epStatusList.set(episodeID, status);
    watchedEpisodes = [...epStatusList.values()].filter(
      (x) => x.type === EpisodeCollectionStatus.Done,
    ).length;
    const newStatus = encodeSubjectEpStatus(epStatusList);
    await t
      .update(schema.chiiEpStatus)
      .set({ status: newStatus, updatedAt: now })
      .where(op.eq(schema.chiiEpStatus.id, current.id))
      .limit(1);
  } else {
    const epStatusList = new Map<number, UserEpisodeStatusItem>();
    const status: UserEpisodeStatusItem = {
      eid: episodeID.toString(),
      type,
      updated_at: { [type]: now },
    };
    epStatusList.set(episodeID, status);
    watchedEpisodes = [...epStatusList.values()].filter(
      (x) => x.type === EpisodeCollectionStatus.Done,
    ).length;
    const newStatus = encodeSubjectEpStatus(epStatusList);
    await t.insert(schema.chiiEpStatus).values({
      uid: userID,
      sid: subjectID,
      status: newStatus,
      updatedAt: now,
    });
  }
  return watchedEpisodes;
}
