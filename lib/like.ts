import * as lo from 'lodash-es';
import { DateTime } from 'luxon';

import { db, op, schema } from '@app/drizzle';
import { BadRequestError } from '@app/lib/error';
import * as fetcher from '@app/lib/types/fetcher.ts';
import type * as res from '@app/lib/types/res.ts';
import { LimitAction } from '@app/lib/utils/rate-limit';
import { rateLimit } from '@app/routes/hooks/rate-limit';

export enum LikeType {
  SubjectCover = 1,

  GroupReply = 8,

  SubjectReply = 10,
  EpisodeReply = 11,

  SubjectCollect = 40,
}

export const ALLOWED_REACTION_TYPES: ReadonlySet<number> = Object.freeze(
  new Set([
    LikeType.GroupReply,
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

export interface NewReaction {
  type: LikeType;
  /** TopicID, SubjectID ... */
  mid: number;
  /** PostID, CollectID ... */
  rid: number;
  uid: number;
  value: number;
}

export interface DeleteReaction {
  type: LikeType;
  rid: number;
  uid: number;
}

function validateReaction(type: LikeType, value: number): boolean {
  switch (type) {
    case LikeType.GroupReply:
    case LikeType.SubjectReply:
    case LikeType.EpisodeReply: {
      return ALLOWED_COMMON_REACTIONS.has(value);
    }
    case LikeType.SubjectCollect: {
      return ALLOWED_SUBJECT_COLLECT_REACTIONS.has(value);
    }
    default: {
      return false;
    }
  }
}

export async function fetchReactionsByMainID(
  mainID: number,
  type: LikeType,
): Promise<Record<number, res.IReaction[]>> {
  if (!ALLOWED_REACTION_TYPES.has(type)) {
    throw new BadRequestError('Invalid reaction type');
  }

  const data = await db
    .select()
    .from(schema.chiiLikes)
    .where(
      op.and(
        op.eq(schema.chiiLikes.mainID, mainID),
        op.eq(schema.chiiLikes.type, type),
        op.eq(schema.chiiLikes.deleted, false),
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

export async function fetchReactionsByRelatedIDs(
  type: LikeType,
  relatedIDs: number[],
): Promise<Record<number, res.IReaction[]>> {
  const data = await db
    .select()
    .from(schema.chiiLikes)
    .where(
      op.and(
        op.eq(schema.chiiLikes.type, type),
        op.inArray(schema.chiiLikes.relatedID, relatedIDs),
        op.eq(schema.chiiLikes.deleted, false),
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

export async function addReaction(reaction: NewReaction) {
  if (!validateReaction(reaction.type, reaction.value)) {
    throw new BadRequestError('Invalid reaction');
  }
  await rateLimit(LimitAction.Like, reaction.uid);
  await db.transaction(async (tx) => {
    const [previous] = await tx
      .select()
      .from(schema.chiiLikes)
      .where(
        op.and(
          op.eq(schema.chiiLikes.type, reaction.type),
          op.eq(schema.chiiLikes.relatedID, reaction.rid),
          op.eq(schema.chiiLikes.uid, reaction.uid),
        ),
      )
      .limit(1);
    if (previous) {
      if (previous.value === reaction.value && !previous.deleted) {
        return;
      } else {
        // 更新
        await tx
          .update(schema.chiiLikes)
          .set({ deleted: false, value: reaction.value })
          .where(
            op.and(
              op.eq(schema.chiiLikes.type, reaction.type),
              op.eq(schema.chiiLikes.relatedID, reaction.rid),
              op.eq(schema.chiiLikes.uid, reaction.uid),
            ),
          );
      }
    } else {
      // 新增
      await tx.insert(schema.chiiLikes).values({
        type: reaction.type,
        mainID: reaction.mid,
        relatedID: reaction.rid,
        uid: reaction.uid,
        value: reaction.value,
        createdAt: DateTime.now().toUnixInteger(),
        deleted: false,
      });
    }
  });
}

export async function deleteReaction(reaction: DeleteReaction) {
  await db.transaction(async (tx) => {
    const [previous] = await tx
      .select()
      .from(schema.chiiLikes)
      .where(
        op.and(
          op.eq(schema.chiiLikes.type, reaction.type),
          op.eq(schema.chiiLikes.relatedID, reaction.rid),
          op.eq(schema.chiiLikes.uid, reaction.uid),
        ),
      )
      .limit(1);
    if (previous && !previous.deleted) {
      await tx
        .update(schema.chiiLikes)
        .set({ deleted: true })
        .where(
          op.and(
            op.eq(schema.chiiLikes.type, reaction.type),
            op.eq(schema.chiiLikes.relatedID, reaction.rid),
            op.eq(schema.chiiLikes.uid, reaction.uid),
          ),
        );
    }
  });
}
