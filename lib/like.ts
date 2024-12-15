import * as lo from 'lodash-es';

import { db, op } from '@app/drizzle/db.ts';
import { chiiLikes } from '@app/drizzle/schema.ts';

export interface Reaction {
  selected: boolean;
  total: number;
  value: number;
}

export const LikeType = {
  subject_cover: 1,

  group_topic: 7,
  group_reply: 8,

  subject_reply: 10,
  ep_reply: 11,

  subject_collect: 40,
} as const;

export const LIKE_REACTIONS_ALLOWED: ReadonlySet<number> = Object.freeze(
  new Set([
    0, // bgm67
    140, // bgm124
    80, // bgm64
    54, // bgm38
    85, // bgm69

    104, // bgm88
    88, // bgm72
    62, // bgm46
    79, // bgm63
    53, // bgm37

    122, // bgm106
    92, // bgm76
    118, // bgm102
    141, // bgm125
    90, // bgm74

    76, // bgm60
    60, // bgm44
    128, // bgm112
    47, // bgm31
    68, // bgm52

    137, // bgm121
    132, // bgm116
  ]),
);

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
