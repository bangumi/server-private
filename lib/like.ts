import * as lo from 'lodash-es';

import { db, op, schema } from '@app/drizzle';
import * as fetcher from '@app/lib/types/fetcher.ts';
import type * as res from '@app/lib/types/res.ts';

export enum LikeType {
  SubjectCover = 1,

  GroupTopic = 7,
  GroupReply = 8,

  SubjectReply = 10,

  EpReply = 11,

  SubjectCollect = 40,
}

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
  type: LikeType,
): Promise<Record<number, res.IReaction[]>> {
  const data = await db
    .select()
    .from(schema.chiiLikes)
    .where(op.and(op.eq(schema.chiiLikes.mainID, topicID), op.eq(schema.chiiLikes.type, type)));

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
    .from(schema.chiiLikes)
    .where(
      op.and(
        op.eq(schema.chiiLikes.type, LikeType.SubjectCollect),
        op.inArray(schema.chiiLikes.relatedID, collectIDs),
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
