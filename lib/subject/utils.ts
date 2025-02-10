import * as php from '@trim21/php-serialize';
import { DateTime } from 'luxon';

import { decr, incr, op, type Txn } from '@app/drizzle/db.ts';
import type * as orm from '@app/drizzle/orm.ts';
import * as schema from '@app/drizzle/schema';

import type { CollectionType } from './type';
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
    .update(schema.chiiSubjects)
    .set(toUpdate)
    .where(op.eq(schema.chiiSubjects.id, subjectID))
    .limit(1);
}

/** 标记条目剧集为已观看，需要在事务中执行 */
export async function markEpisodesAsWatched(
  t: Txn,
  uid: number,
  sid: number,
  episodeIDs: number[],
) {
  const epStatusList: Record<number, { eid: string; type: number }> = {};
  for (const episodeID of episodeIDs) {
    epStatusList[episodeID] = {
      eid: episodeID.toString(),
      type: EpisodeCollectionStatus.Done,
    };
  }
  const [current] = await t
    .select()
    .from(schema.chiiEpStatus)
    .where(op.and(op.eq(schema.chiiEpStatus.uid, uid), op.eq(schema.chiiEpStatus.sid, sid)));
  if (current) {
    if (current.status) {
      const oldList = php.parse(current.status) as Record<number, { eid: string; type: number }>;
      for (const [eid, x] of Object.entries(oldList)) {
        const episodeID = Number.parseInt(eid);
        if (Number.isNaN(episodeID)) {
          continue;
        }
        if (!episodeIDs.includes(episodeID)) {
          epStatusList[episodeID] = x;
        }
      }
    }
    const newStatus = php.stringify(epStatusList);
    await t
      .update(schema.chiiEpStatus)
      .set({ status: newStatus, updatedAt: DateTime.now().toUnixInteger() })
      .where(op.eq(schema.chiiEpStatus.id, current.id))
      .limit(1);
  } else {
    const newStatus = php.stringify(epStatusList);
    await t.insert(schema.chiiEpStatus).values({
      uid,
      sid,
      status: newStatus,
      updatedAt: DateTime.now().toUnixInteger(),
    });
  }
}
