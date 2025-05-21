import { DateTime } from 'luxon';

import { db, op, schema, type Txn } from '@app/drizzle';
import { decode } from '@app/lib/utils';

import { type UserEpisodeStatusItem } from './type';
import { EpisodeCollectionStatus } from './type';

export function parseSubjectEpStatus(status: string): Map<number, UserEpisodeStatusItem> {
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
  return parseSubjectEpStatus(data.status);
}

/** 标记条目剧集为已观看，需要在事务中执行 */
export async function markEpisodesAsWatched(
  t: Txn,
  userID: number,
  subjectID: number,
  episodeIDs: number[],
  revertOthers = false,
): Promise<number> {
  const epStatusList = new Map<number, UserEpisodeStatusItem>();
  for (const episodeID of episodeIDs) {
    epStatusList.set(episodeID, {
      eid: episodeID.toString(),
      type: EpisodeCollectionStatus.Done,
    });
  }
  const [current] = await t
    .select()
    .from(schema.chiiEpStatus)
    .where(
      op.and(op.eq(schema.chiiEpStatus.uid, userID), op.eq(schema.chiiEpStatus.sid, subjectID)),
    );
  let watchedEpisodes = 0;
  if (current?.status) {
    const oldList = parseSubjectEpStatus(current.status);
    for (const [eid, x] of oldList) {
      if (episodeIDs.includes(eid)) {
        continue;
      }
      if (revertOthers && x.type === EpisodeCollectionStatus.Done) {
        epStatusList.set(eid, {
          eid: x.eid,
          type: EpisodeCollectionStatus.None,
        });
      } else {
        epStatusList.set(eid, x);
      }
    }
    watchedEpisodes = [...epStatusList.values()].filter(
      (x) => x.type === EpisodeCollectionStatus.Done,
    ).length;
    const newStatus = JSON.stringify(epStatusList);
    await t
      .update(schema.chiiEpStatus)
      .set({ status: newStatus, updatedAt: DateTime.now().toUnixInteger() })
      .where(op.eq(schema.chiiEpStatus.id, current.id))
      .limit(1);
  } else {
    watchedEpisodes = [...epStatusList.values()].filter(
      (x) => x.type === EpisodeCollectionStatus.Done,
    ).length;
    const newStatus = JSON.stringify(epStatusList);
    await t.insert(schema.chiiEpStatus).values({
      uid: userID,
      sid: subjectID,
      status: newStatus,
      updatedAt: DateTime.now().toUnixInteger(),
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
  const [current] = await t
    .select()
    .from(schema.chiiEpStatus)
    .where(
      op.and(op.eq(schema.chiiEpStatus.uid, userID), op.eq(schema.chiiEpStatus.sid, subjectID)),
    );
  let watchedEpisodes = 0;
  if (current) {
    const epStatusList = parseSubjectEpStatus(current.status);
    epStatusList.set(episodeID, {
      eid: episodeID.toString(),
      type,
    });
    watchedEpisodes = [...epStatusList.values()].filter(
      (x) => x.type === EpisodeCollectionStatus.Done,
    ).length;
    const newStatus = JSON.stringify(epStatusList);
    await t
      .update(schema.chiiEpStatus)
      .set({ status: newStatus, updatedAt: DateTime.now().toUnixInteger() })
      .where(op.eq(schema.chiiEpStatus.id, current.id))
      .limit(1);
  } else {
    const epStatusList = new Map<number, UserEpisodeStatusItem>();
    epStatusList.set(episodeID, {
      eid: episodeID.toString(),
      type,
    });
    watchedEpisodes = [...epStatusList.values()].filter(
      (x) => x.type === EpisodeCollectionStatus.Done,
    ).length;
    const newStatus = JSON.stringify(epStatusList);
    await t.insert(schema.chiiEpStatus).values({
      uid: userID,
      sid: subjectID,
      status: newStatus,
      updatedAt: DateTime.now().toUnixInteger(),
    });
  }
  return watchedEpisodes;
}
