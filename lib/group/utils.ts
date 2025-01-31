import { db, op } from '@app/drizzle/db.ts';
import * as schema from '@app/drizzle/schema.ts';

/** Is user member of group */
export async function isMemberInGroup(userID: number, groupID: number): Promise<boolean> {
  const [d] = await db
    .select({ uid: schema.chiiGroupMembers.uid, gid: schema.chiiGroupMembers.gid })
    .from(schema.chiiGroupMembers)
    .where(
      op.and(
        op.eq(schema.chiiGroupMembers.uid, userID),
        op.eq(schema.chiiGroupMembers.gid, groupID),
      ),
    )
    .limit(1);

  return Boolean(d);
}
