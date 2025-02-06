import { DateTime } from 'luxon';

import { db, op } from '@app/drizzle/db';
import * as schema from '@app/drizzle/schema';
import type { IAuth } from '@app/lib/auth/index.ts';
import { NotAllowedError } from '@app/lib/auth/index.ts';
import { Dam } from '@app/lib/dam.ts';
import { BadRequestError, NotFoundError } from '@app/lib/error.ts';
import { fetchTopicReactions, LikeType } from '@app/lib/like.ts';
import { CommentState } from '@app/lib/topic/type.ts';
import * as fetcher from '@app/lib/types/fetcher.ts';
import type * as req from '@app/lib/types/req.ts';
import type * as res from '@app/lib/types/res.ts';
import { LimitAction } from '@app/lib/utils/rate-limit/index.ts';
import { rateLimit } from '@app/routes/hooks/rate-limit';

export enum CommentTarget {
  Episode = 1,
  Character = 2,
  Person = 3,
  Index = 4,
  Blog = 5,
  Timeline = 6,
}

const commentTables = {
  [CommentTarget.Episode]: schema.chiiEpComments,
  [CommentTarget.Character]: schema.chiiCrtComments,
  [CommentTarget.Person]: schema.chiiPrsnComments,
  [CommentTarget.Index]: schema.chiiIndexComments,
  [CommentTarget.Blog]: schema.chiiBlogComments,
  [CommentTarget.Timeline]: schema.chiiTimelineComments,
};

export class Comment {
  private readonly target: CommentTarget;
  private readonly table: (typeof commentTables)[CommentTarget];

  constructor(target: CommentTarget) {
    this.target = target;
    this.table = commentTables[target];
  }

  async getAll(mainID: number) {
    const data = await db.select().from(this.table).where(op.eq(this.table.mid, mainID));
    const uids = data.map((v) => v.uid);
    const users = await fetcher.fetchSlimUsersByIDs(uids);

    const comments: res.IComment[] = [];
    const replies: Record<number, res.ICommentBase[]> = {};

    let allReactions: Record<number, res.IReaction[]> = {};
    if (this.target === CommentTarget.Episode) {
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
    body: req.ICreateComment,
  ): Promise<{ id: number }> {
    if (!Dam.allCharacterPrintable(body.content)) {
      throw new BadRequestError('text contains invalid invisible character');
    }
    if (auth.permission.ban_post) {
      throw new NotAllowedError('create comment');
    }

    if (body.replyTo === undefined) {
      body.replyTo = 0;
    }
    if (body.replyTo !== 0) {
      const [parent] = await db
        .select({ id: this.table.id, state: this.table.state })
        .from(this.table)
        .where(op.eq(this.table.id, body.replyTo))
        .limit(1);
      if (!parent) {
        throw new NotFoundError(`parent comment id ${body.replyTo}`);
      }
      if (parent.state !== CommentState.Normal) {
        throw new NotAllowedError(`reply to a abnormal state comment`);
      }
    }

    await rateLimit(LimitAction.Comment, auth.userID);

    const reply: typeof this.table.$inferInsert = {
      mid: mainID,
      uid: auth.userID,
      related: body.replyTo,
      content: body.content,
      createdAt: DateTime.now().toUnixInteger(),
      state: CommentState.Normal,
    };
    const [result] = await db.insert(this.table).values(reply);
    return { id: result.insertId };
  }

  async update(auth: Readonly<IAuth>, commentID: number, body: req.IUpdateComment) {
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

    await db
      .update(this.table)
      .set({ content: body.content })
      .where(op.eq(this.table.id, commentID));

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

    // 其它表暂时没有 state 字段
    switch (this.table) {
      case schema.chiiEpComments:
      case schema.chiiCrtComments:
      case schema.chiiPrsnComments: {
        await db
          .update(this.table)
          .set({ state: CommentState.UserDelete })
          .where(op.eq(this.table.id, commentID))
          .limit(1);
        break;
      }
      default: {
        await db.delete(this.table).where(op.eq(this.table.id, commentID)).limit(1);
      }
    }

    return {};
  }
}
