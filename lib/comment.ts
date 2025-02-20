import { DateTime } from 'luxon';

import { db, incr, op, schema } from '@app/drizzle';
import type { IAuth } from '@app/lib/auth/index.ts';
import { NotAllowedError } from '@app/lib/auth/index.ts';
import { Dam } from '@app/lib/dam.ts';
import { BadRequestError, NotFoundError } from '@app/lib/error.ts';
import { fetchTopicReactions, LikeType } from '@app/lib/like.ts';
import { CommentState } from '@app/lib/topic/type.ts';
import * as fetcher from '@app/lib/types/fetcher.ts';
import type * as res from '@app/lib/types/res.ts';
import { LimitAction } from '@app/lib/utils/rate-limit/index.ts';
import { rateLimit } from '@app/routes/hooks/rate-limit';

type commentTablesWithState =
  | typeof schema.chiiEpComments
  | typeof schema.chiiCrtComments
  | typeof schema.chiiPrsnComments;

type commentTablesWithoutState =
  | typeof schema.chiiIndexComments
  | typeof schema.chiiBlogComments
  | typeof schema.chiiTimelineComments;

export class CommentWithState {
  private readonly table: commentTablesWithState;

  constructor(table: commentTablesWithState) {
    this.table = table;
  }

  async getAll(mainID: number) {
    const data = await db
      .select()
      .from(this.table)
      .where(op.eq(this.table.mid, mainID))
      .orderBy(op.asc(this.table.id));
    const uids = data.map((v) => v.uid);
    const users = await fetcher.fetchSlimUsersByIDs(uids);
    const comments: res.IComment[] = [];
    const replies: Record<number, res.ICommentBase[]> = {};
    let allReactions: Record<number, res.IReaction[]> = {};
    if (this.table === schema.chiiEpComments) {
      allReactions = await fetchTopicReactions(mainID, LikeType.EpReply);
    }
    for (const d of data) {
      const user = users[d.uid];
      const comment: res.ICommentBase = {
        id: d.id,
        mainID: d.mid,
        creatorID: d.uid,
        relatedID: d.related,
        content: d.content,
        createdAt: d.createdAt,
        state: d.state,
        reactions: allReactions[d.id],
      };
      if (d.related === 0) {
        comments.push({ ...comment, replies: [], user });
      } else {
        const rs = replies[d.related] ?? [];
        rs.push({ ...comment, user });
        replies[d.related] = rs;
      }
    }
    for (const comment of comments) {
      comment.replies = replies[comment.id] ?? [];
    }
    return comments;
  }

  async create(
    auth: Readonly<IAuth>,
    mainID: number,
    content: string,
    replyTo: number,
  ): Promise<{ id: number }> {
    if (!Dam.allCharacterPrintable(content)) {
      throw new BadRequestError('text contains invalid invisible character');
    }
    if (auth.permission.ban_post) {
      throw new NotAllowedError('create comment');
    }
    if (replyTo !== 0) {
      const [parent] = await db
        .select({ id: this.table.id, state: this.table.state })
        .from(this.table)
        .where(op.eq(this.table.id, replyTo))
        .limit(1);
      if (!parent) {
        throw new NotFoundError(`parent comment id ${replyTo}`);
      }
      if (parent.state !== CommentState.Normal) {
        throw new NotAllowedError(`reply to a abnormal state comment`);
      }
    }
    await rateLimit(LimitAction.Comment, auth.userID);
    const reply: typeof this.table.$inferInsert = {
      mid: mainID,
      uid: auth.userID,
      related: replyTo,
      content,
      createdAt: DateTime.now().toUnixInteger(),
      state: CommentState.Normal,
    };
    let insertId = 0;
    await db.transaction(async (tx) => {
      const [result] = await tx.insert(this.table).values(reply);
      insertId = result.insertId;
      switch (this.table) {
        case schema.chiiEpComments: {
          await tx
            .update(schema.chiiEpisodes)
            .set({
              comment: incr(schema.chiiEpisodes.comment),
            })
            .where(op.eq(schema.chiiEpisodes.id, mainID))
            .limit(1);
          break;
        }
        case schema.chiiCrtComments: {
          await tx
            .update(schema.chiiEpisodes)
            .set({
              comment: incr(schema.chiiEpisodes.comment),
            })
            .where(op.eq(schema.chiiEpisodes.id, mainID))
            .limit(1);
          break;
        }
        case schema.chiiPrsnComments: {
          await tx
            .update(schema.chiiEpisodes)
            .set({
              comment: incr(schema.chiiEpisodes.comment),
            })
            .where(op.eq(schema.chiiEpisodes.id, mainID))
            .limit(1);
          break;
        }
      }
    });
    return { id: insertId };
  }

  async update(auth: Readonly<IAuth>, commentID: number, content: string) {
    const [current] = await db
      .select()
      .from(this.table)
      .where(op.eq(this.table.id, commentID))
      .limit(1);
    if (!current) {
      throw new NotFoundError(`comment id ${commentID}`);
    }
    if (current.uid !== auth.userID) {
      throw new NotAllowedError('edit a comment which is not yours');
    }
    if (current.state !== CommentState.Normal) {
      throw new NotAllowedError(`edit to a abnormal state comment`);
    }
    const [reply] = await db
      .select({ id: this.table.id })
      .from(this.table)
      .where(op.and(op.eq(this.table.mid, current.mid), op.eq(this.table.related, current.id)))
      .limit(1);
    if (reply) {
      throw new NotAllowedError('cannot edit a comment with replies');
    }
    await db.update(this.table).set({ content }).where(op.eq(this.table.id, commentID));
    return {};
  }

  async delete(auth: Readonly<IAuth>, commentID: number) {
    const [comment] = await db
      .select()
      .from(this.table)
      .where(op.eq(this.table.id, commentID))
      .limit(1);
    if (!comment) {
      throw new NotFoundError(`comment id ${commentID}`);
    }
    if (comment.uid !== auth.userID) {
      throw new NotAllowedError('delete a comment which is not yours');
    }
    if (comment.state !== CommentState.Normal) {
      throw new NotAllowedError('delete a abnormal state comment');
    }
    await db
      .update(this.table)
      .set({ state: CommentState.UserDelete })
      .where(op.eq(this.table.id, commentID))
      .limit(1);
    return {};
  }
}

export class CommentWithoutState {
  private readonly table: commentTablesWithoutState;

  constructor(table: commentTablesWithoutState) {
    this.table = table;
  }

  async getAll(mainID: number) {
    const data = await db
      .select()
      .from(this.table)
      .where(op.eq(this.table.mid, mainID))
      .orderBy(op.asc(this.table.id));
    const uids = data.map((v) => v.uid);
    const users = await fetcher.fetchSlimUsersByIDs(uids);
    const comments: res.IComment[] = [];
    const replies: Record<number, res.ICommentBase[]> = {};
    for (const d of data) {
      const user = users[d.uid];
      const comment: res.ICommentBase = {
        id: d.id,
        mainID: d.mid,
        creatorID: d.uid,
        relatedID: d.related,
        content: d.content,
        createdAt: d.createdAt,
        state: CommentState.Normal,
      };
      if (d.related === 0) {
        comments.push({ ...comment, replies: [], user });
      } else {
        const rs = replies[d.related] ?? [];
        rs.push({ ...comment, user });
        replies[d.related] = rs;
      }
    }
    for (const comment of comments) {
      comment.replies = replies[comment.id] ?? [];
    }
    return comments;
  }

  async create(
    auth: Readonly<IAuth>,
    mainID: number,
    content: string,
    replyTo: number,
  ): Promise<{ id: number }> {
    if (!Dam.allCharacterPrintable(content)) {
      throw new BadRequestError('text contains invalid invisible character');
    }
    if (auth.permission.ban_post) {
      throw new NotAllowedError('create comment');
    }
    if (replyTo !== 0) {
      const [parent] = await db
        .select({ id: this.table.id })
        .from(this.table)
        .where(op.eq(this.table.id, replyTo))
        .limit(1);
      if (!parent) {
        throw new NotFoundError(`parent comment id ${replyTo}`);
      }
    }
    await rateLimit(LimitAction.Comment, auth.userID);
    const reply: typeof this.table.$inferInsert = {
      mid: mainID,
      uid: auth.userID,
      related: replyTo,
      content,
      createdAt: DateTime.now().toUnixInteger(),
    };
    let insertId = 0;
    await db.transaction(async (tx) => {
      const [result] = await tx.insert(this.table).values(reply);
      insertId = result.insertId;
      switch (this.table) {
        case schema.chiiIndexComments: {
          await tx
            .update(schema.chiiIndexes)
            .set({
              replies: incr(schema.chiiIndexes.replies),
            })
            .where(op.eq(schema.chiiIndexes.id, mainID))
            .limit(1);
          break;
        }
        case schema.chiiBlogComments: {
          await tx
            .update(schema.chiiBlogEntries)
            .set({
              replies: incr(schema.chiiBlogEntries.replies),
            })
            .where(op.eq(schema.chiiBlogEntries.id, mainID))
            .limit(1);
          break;
        }
        case schema.chiiTimelineComments: {
          await tx
            .update(schema.chiiTimeline)
            .set({
              replies: incr(schema.chiiTimeline.replies),
            })
            .where(op.eq(schema.chiiTimeline.id, mainID))
            .limit(1);
          break;
        }
      }
    });
    return { id: insertId };
  }

  async update(auth: Readonly<IAuth>, commentID: number, content: string) {
    const [current] = await db
      .select()
      .from(this.table)
      .where(op.eq(this.table.id, commentID))
      .limit(1);
    if (!current) {
      throw new NotFoundError(`comment id ${commentID}`);
    }
    if (current.uid !== auth.userID) {
      throw new NotAllowedError('edit a comment which is not yours');
    }

    const [reply] = await db
      .select({ id: this.table.id })
      .from(this.table)
      .where(op.and(op.eq(this.table.mid, current.mid), op.eq(this.table.related, current.id)))
      .limit(1);
    if (reply) {
      throw new NotAllowedError('cannot edit a comment with replies');
    }
    await db.update(this.table).set({ content }).where(op.eq(this.table.id, commentID));
    return {};
  }

  async delete(auth: Readonly<IAuth>, commentID: number) {
    const [comment] = await db
      .select()
      .from(this.table)
      .where(op.eq(this.table.id, commentID))
      .limit(1);
    if (!comment) {
      throw new NotFoundError(`comment id ${commentID}`);
    }
    if (comment.uid !== auth.userID) {
      throw new NotAllowedError('delete a comment which is not yours');
    }
    await db.delete(this.table).where(op.eq(this.table.id, commentID)).limit(1);
    return {};
  }
}
