import { db, op } from '@app/drizzle/db.ts';
import * as schema from '@app/drizzle/schema';

import * as convert from './convert.ts';
import type * as res from './res.ts';

export async function fetchSubjectByID(id: number): Promise<res.ISubject | null> {
  const data = await db
    .select()
    .from(schema.chiiSubjects)
    .innerJoin(schema.chiiSubjectFields, op.eq(schema.chiiSubjects.id, schema.chiiSubjectFields.id))
    .where(op.and(op.eq(schema.chiiSubjects.id, id), op.eq(schema.chiiSubjects.ban, 0)))
    .execute();
  for (const d of data) {
    return convert.toSubject(d.subject, d.subject_field);
  }
  return null;
}
