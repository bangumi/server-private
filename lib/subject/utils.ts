import { decr, incr, op, type orm, schema, type Txn } from '@app/drizzle';

import { markEpisodesAsWatched } from './ep';
import { type CollectionType, SubjectType } from './type';
import { getCollectionTypeField } from './type';

/** 更新条目收藏计数，需要在事务中执行 */
export async function updateSubjectCollectionCounts(
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
