import { db, op } from '@app/drizzle/db.ts';
import * as schema from '@app/drizzle/schema.ts';

export async function fetchFriends(id?: number): Promise<Record<number, boolean>> {
  if (!id) {
    return {};
  }

  const friends = await db
    .select()
    .from(schema.chiiFriends)
    .where(op.eq(schema.chiiFriends.uid, id));

  return Object.fromEntries(friends.map((x) => [x.fid, true]));
}

/** Is user(another) is friend of user(userID) */
export async function isFriends(userID: number, another: number): Promise<boolean> {
  const [d] = await db
    .select({ uid: schema.chiiFriends.uid, fid: schema.chiiFriends.fid })
    .from(schema.chiiFriends)
    .where(op.and(op.eq(schema.chiiFriends.uid, userID), op.eq(schema.chiiFriends.fid, another)));

  return Boolean(d);
}
