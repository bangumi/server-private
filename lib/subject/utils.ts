import * as php from '@trim21/php-serialize';
import { DateTime } from 'luxon';

import { db, decr, incr, op, type orm, schema, type Txn } from '@app/drizzle';

import { type CollectionType, SubjectType, type UserEpisodeStatusItem } from './type';
import { EpisodeCollectionStatus, getCollectionTypeField } from './type';

/** 更新条目收藏计数，需要在事务中执行 */
export async function updateSubjectCollection(
  t: Txn,
  subjectID: number,
  newType: CollectionType,
  oldType?: CollectionType,
) {
  if (oldType && oldType === newType) {
    return;
  }
  const toUpdate: Record<string, op.SQL> = {};
  toUpdate[getCollectionTypeField(newType)] = incr(
    schema.chiiSubjects[getCollectionTypeField(newType)],
  );
  if (oldType) {
    toUpdate[getCollectionTypeField(oldType)] = decr(
      schema.chiiSubjects[getCollectionTypeField(oldType)],
    );
  }
  await t
    .update(schema.chiiSubjects)
    .set(toUpdate)
    .where(op.eq(schema.chiiSubjects.id, subjectID))
    .limit(1);
}

function getRatingField(rate: number) {
  return [
    undefined,
    'rate1',
    'rate2',
    'rate3',
    'rate4',
    'rate5',
    'rate6',
    'rate7',
    'rate8',
    'rate9',
    'rate10',
  ][rate];
}

/** 更新条目评分，需要在事务中执行 */
export async function updateSubjectRating(
  t: Txn,
  subjectID: number,
  oldRate: number,
  newRate: number,
) {
  if (oldRate === newRate) {
    return;
  }
  const newField = getRatingField(newRate);
  const oldField = getRatingField(oldRate);
  const toUpdate: Record<string, op.SQL> = {};
  if (newField) {
    const field = newField as keyof orm.ISubjectFields;
    toUpdate[field] = incr(schema.chiiSubjectFields[field]);
  }
  if (oldField) {
    const field = oldField as keyof orm.ISubjectFields;
    toUpdate[field] = decr(schema.chiiSubjectFields[field]);
  }
  if (Object.keys(toUpdate).length === 0) {
    return;
  }
  await t
    .update(schema.chiiSubjectFields)
    .set(toUpdate)
    .where(op.eq(schema.chiiSubjectFields.id, subjectID))
    .limit(1);
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
  if (current?.status) {
    const epStatusList = parseSubjectEpStatus(current.status);
    epStatusList[episodeID] = {
      eid: episodeID,
      type,
    };
    watchedEpisodes = Object.values(epStatusList).filter(
      (x) => x.type === EpisodeCollectionStatus.Done,
    ).length;
    const newStatus = php.stringify(epStatusList);
    await t
      .update(schema.chiiEpStatus)
      .set({ status: newStatus, updatedAt: DateTime.now().toUnixInteger() })
      .where(op.eq(schema.chiiEpStatus.id, current.id))
      .limit(1);
  } else {
    const epStatusList: Record<number, UserEpisodeStatusItem> = {};
    epStatusList[episodeID] = {
      eid: episodeID,
      type,
    };
    watchedEpisodes = Object.values(epStatusList).filter(
      (x) => x.type === EpisodeCollectionStatus.Done,
    ).length;
    const newStatus = php.stringify(epStatusList);
    await t.insert(schema.chiiEpStatus).values({
      uid: userID,
      sid: subjectID,
      status: newStatus,
      updatedAt: DateTime.now().toUnixInteger(),
    });
  }
  return watchedEpisodes;
}

/** 标记条目剧集为已观看，需要在事务中执行 */
export async function markEpisodesAsWatched(
  t: Txn,
  userID: number,
  subjectID: number,
  episodeIDs: number[],
  revertOthers = false,
): Promise<number> {
  const epStatusList: Record<number, UserEpisodeStatusItem> = {};
  for (const episodeID of episodeIDs) {
    epStatusList[episodeID] = {
      eid: episodeID,
      type: EpisodeCollectionStatus.Done,
    };
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
    for (const x of Object.values(oldList)) {
      if (episodeIDs.includes(x.eid)) {
        continue;
      }
      if (revertOthers && x.type === EpisodeCollectionStatus.Done) {
        epStatusList[x.eid] = {
          eid: x.eid,
          type: EpisodeCollectionStatus.None,
        };
      } else {
        epStatusList[x.eid] = x;
      }
    }
    watchedEpisodes = Object.values(epStatusList).filter(
      (x) => x.type === EpisodeCollectionStatus.Done,
    ).length;
    const newStatus = php.stringify(epStatusList);
    await t
      .update(schema.chiiEpStatus)
      .set({ status: newStatus, updatedAt: DateTime.now().toUnixInteger() })
      .where(op.eq(schema.chiiEpStatus.id, current.id))
      .limit(1);
  } else {
    watchedEpisodes = Object.values(epStatusList).filter(
      (x) => x.type === EpisodeCollectionStatus.Done,
    ).length;
    const newStatus = php.stringify(epStatusList);
    await t.insert(schema.chiiEpStatus).values({
      uid: userID,
      sid: subjectID,
      status: newStatus,
      updatedAt: DateTime.now().toUnixInteger(),
    });
  }
  return watchedEpisodes;
}

export function parseSubjectEpStatus(status: string): Record<number, UserEpisodeStatusItem> {
  const result: Record<number, UserEpisodeStatusItem> = {};
  if (!status) {
    return result;
  }
  const epStatusList = php.parse(status) as Record<number, UserEpisodeStatusItem>;
  for (const x of Object.values(epStatusList)) {
    result[x.eid] = x;
  }
  return result;
}

export async function getEpStatus(
  userID: number,
  subjectID: number,
): Promise<Record<number, UserEpisodeStatusItem>> {
  const [data] = await db
    .select()
    .from(schema.chiiEpStatus)
    .where(
      op.and(op.eq(schema.chiiEpStatus.uid, userID), op.eq(schema.chiiEpStatus.sid, subjectID)),
    )
    .limit(1);
  if (!data) {
    return {};
  }
  return parseSubjectEpStatus(data.status);
}

/** 完成条目进度，需要在事务中执行 */
export async function completeSubjectProgress(
  t: Txn,
  userID: number,
  subject: orm.ISubject,
  interest: Partial<orm.ISubjectInterest>,
) {
  if (subject.eps > 0) {
    interest.epStatus = subject.eps;
  }
  if (subject.volumes > 0) {
    interest.volStatus = subject.volumes;
  }
  if ([SubjectType.Anime, SubjectType.Real].includes(subject.typeID)) {
    const episodes = await t
      .select({ id: schema.chiiEpisodes.id })
      .from(schema.chiiEpisodes)
      .where(
        op.and(
          op.eq(schema.chiiEpisodes.subjectID, subject.id),
          op.eq(schema.chiiEpisodes.type, 0),
          op.eq(schema.chiiEpisodes.ban, 0),
        ),
      );
    const episodeIDs = episodes.map((e) => e.id);
    if (episodeIDs.length > 0) {
      await markEpisodesAsWatched(t, userID, subject.id, episodeIDs);
    }
  }
}
