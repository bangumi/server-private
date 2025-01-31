import * as lo from 'lodash-es';

import { db, op } from '@app/drizzle/db.ts';
import { chiiLikes } from '@app/drizzle/schema.ts';
import * as fetcher from '@app/lib/types/fetcher.ts';
import type * as res from '@app/lib/types/res.ts';

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
  topicID: number,
): Promise<Record<number, res.IReaction[]>> {
  const data = await db.select().from(chiiLikes).where(op.eq(chiiLikes.mainID, topicID));

  const uids = data.map((x) => x.uid);
  const users = await fetcher.fetchSimpleUsersByIDs(uids);
  const r = lo.groupBy(data, (x) => x.relatedID);

  return lo.mapValues(r, (v): res.IReaction[] => {
    return Object.entries(
      lo.groupBy(v, (a) => {
        return a.value;
      }),
    ).map(([key, values]) => {
      return {
        users: values.map((x) => users[x.uid]).filter((x) => x !== undefined),
        value: Number(key),
      };
    });
  });
}

export async function fetchSubjectCollectReactions(
  collectIDs: number[],
): Promise<Record<number, res.IReaction[]>> {
  const data = await db
    .select()
    .from(chiiLikes)
    .where(
      op.and(
        op.eq(chiiLikes.type, LikeType.subject_collect),
        op.inArray(chiiLikes.relatedID, collectIDs),
      ),
    );

  const uids = data.map((x) => x.uid);
  const users = await fetcher.fetchSimpleUsersByIDs(uids);
  const r = lo.groupBy(data, (x) => x.relatedID);

  return lo.mapValues(r, (v): res.IReaction[] => {
    return Object.entries(
      lo.groupBy(v, (a) => {
        return a.value;
      }),
    ).map(([key, values]) => {
      return {
        users: values.map((x) => users[x.uid]).filter((x) => x !== undefined),
        value: Number(key),
      };
    });
  });
}
