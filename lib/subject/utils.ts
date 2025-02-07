import { decr, incr, op, type Txn } from '@app/drizzle/db.ts';
import type * as orm from '@app/drizzle/orm.ts';
import * as schema from '@app/drizzle/schema';

function getField(rate: number) {
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
  const newField = getField(newRate);
  const oldField = getField(oldRate);
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
