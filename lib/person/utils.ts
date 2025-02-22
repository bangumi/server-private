import { db, op, schema } from '@app/drizzle';

import type { PersonCat } from './type';

export async function getPersonCollect(
  cat: PersonCat,
  userID: number,
  personID: number,
): Promise<number | null> {
  const [d] = await db
    .select()
    .from(schema.chiiPersonCollects)
    .where(
      op.and(
        op.eq(schema.chiiPersonCollects.cat, cat),
        op.eq(schema.chiiPersonCollects.uid, userID),
        op.eq(schema.chiiPersonCollects.mid, personID),
      ),
    )
    .limit(1);
  if (!d) {
    return null;
  }
  return d.createdAt;
}
