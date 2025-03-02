import * as lo from 'lodash-es';

import { db, op, schema } from '@app/drizzle';
import * as fetcher from '@app/lib/types/fetcher.ts';
import type * as res from '@app/lib/types/res.ts';

export enum LikeType {
  SubjectCover = 1,

  GroupReply = 8,

  SubjectReply = 10,
  EpisodeReply = 11,

  SubjectCollect = 40,
}

export const ALLOWED_REACTION_TYPES: ReadonlySet<number> = Object.freeze(
  new Set([
    LikeType.SubjectCover,
    LikeType.SubjectReply,
    LikeType.EpisodeReply,
    LikeType.SubjectCollect,
  ]),
);

export const REACTIONS: ReadonlySet<number> = Object.freeze(
  new Set([
    0, // bgm67
    79, // bgm63
    54, // bgm38
    140, // bgm124

    62, // bgm46
    122, // bgm106
    104, // bgm88
    80, // bgm64

    141, // bgm125
    88, // bgm72
    85, // bgm69
    90, // bgm74

    // hidden
    53, // bgm37
    92, // bgm76
    118, // bgm102
    60, // bgm44
    128, // bgm112
    47, // bgm31
    68, // bgm52
    137, // bgm121
    76, // bgm60
    132, // bgm116
  ]),
);

export const ALLOWED_SUBJECT_COLLECT_REACTIONS: ReadonlySet<number> = Object.freeze(
  new Set([
    0, // bgm67
    104, // bgm88
    54, // bgm38
    140, // bgm124

    122, // bgm106
    90, // bgm74
    88, // bgm72
    80, // bgm64
  ]),
);

export const ALLOWED_COMMON_REACTIONS: ReadonlySet<number> = Object.freeze(
  new Set([
    0, // bgm67
    79, // bgm63
    54, // bgm38
    140, // bgm124

    62, // bgm46
    122, // bgm106
    104, // bgm88
    80, // bgm64

    141, // bgm125
    88, // bgm72
    85, // bgm69
    90, // bgm74
  ]),
);

export async function fetchReactions(
  mainID: number,
  type: LikeType,
): Promise<Record<number, res.IReaction[]>> {
  if (!ALLOWED_REACTION_TYPES.has(type)) {
    throw new Error(`Invalid reaction type: ${type}`);
  }

  const data = await db
    .select()
    .from(schema.chiiLikes)
    .where(op.and(op.eq(schema.chiiLikes.mainID, mainID), op.eq(schema.chiiLikes.type, type)));

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
