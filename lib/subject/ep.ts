import { db, op, schema } from '@app/drizzle';
import { decode } from '@app/lib/utils';

import { type UserEpisodeStatusItem } from './type';

export function parseSubjectEpStatus(status: string): Map<number, UserEpisodeStatusItem> {
  const result = new Map<number, UserEpisodeStatusItem>();
  if (!status) {
    return result;
  }
  const epStatusList = decode(status) as Record<number, UserEpisodeStatusItem>;
  for (const [eid, x] of Object.entries(epStatusList)) {
    result.set(Number(eid), x);
  }
  return result;
}

export async function getEpStatus(
  userID: number,
  subjectID: number,
): Promise<Map<number, UserEpisodeStatusItem>> {
  const [data] = await db
    .select()
    .from(schema.chiiEpStatus)
    .where(
      op.and(op.eq(schema.chiiEpStatus.uid, userID), op.eq(schema.chiiEpStatus.sid, subjectID)),
    )
    .limit(1);
  if (!data) {
    return new Map();
  }
  return parseSubjectEpStatus(data.status);
}
