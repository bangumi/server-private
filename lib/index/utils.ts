import { db, op, schema } from '@app/drizzle';

export async function getIndexCollect(userID: number, indexID: number): Promise<number | null> {
  const [d] = await db
    .select()
    .from(schema.chiiIndexCollects)
    .where(
      op.and(
        op.eq(schema.chiiIndexCollects.uid, userID),
        op.eq(schema.chiiIndexCollects.mid, indexID),
      ),
    )
    .limit(1);
  if (!d) {
    return null;
  }
  return d.createdAt;
}
