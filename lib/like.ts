import * as lo from 'lodash-es';

import { db, op } from '@app/drizzle/db.ts';
import { chiiLikes } from '@app/drizzle/schema.ts';

export interface Reaction {
  selected: boolean;
  total: number;
  value: number;
}

export async function fetchTopicReactions(
  id: number,
  uid: number,
): Promise<Record<number, Reaction[]>> {
  const data = await db.select().from(chiiLikes).where(op.eq(chiiLikes.mainID, id)).execute();

  const r = lo.groupBy(data, (x) => x.relatedID);

  return lo.mapValues(r, (v): Reaction[] => {
    return Object.entries(
      lo.groupBy(v, (a) => {
        return a.value;
      }),
    ).map(([key, values]) => {
      return {
        selected: values.some((x) => x.uid === uid),
        total: values.length,
        value: Number(key),
      };
    });
  });
}
