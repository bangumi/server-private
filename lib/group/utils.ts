import { db, op, schema } from '@app/drizzle';
import * as convert from '@app/lib/types/convert';
import type * as res from '@app/lib/types/res';

export async function getGroupMember(
  userID: number,
  groupID: number,
): Promise<res.IGroupMember | null> {
  const [d] = await db
    .select()
    .from(schema.chiiGroupMembers)
    .where(
      op.and(
        op.eq(schema.chiiGroupMembers.uid, userID),
        op.eq(schema.chiiGroupMembers.gid, groupID),
      ),
    )
    .limit(1);
  if (!d) {
    return null;
  }
  return convert.toGroupMember(d);
}

/** Is user member of group */
export async function isMemberInGroup(userID: number, groupID: number): Promise<boolean> {
  const member = await getGroupMember(userID, groupID);
  return Boolean(member);
}
