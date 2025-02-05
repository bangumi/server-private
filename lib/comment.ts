import { DateTime } from 'luxon';

import { db, op } from '@app/drizzle/db';
import * as schema from '@app/drizzle/schema';
import type { IAuth } from '@app/lib/auth/index.ts';
import { NotAllowedError } from '@app/lib/auth/index.ts';
import { Dam } from '@app/lib/dam.ts';
import { BadRequestError, CaptchaError, NotFoundError } from '@app/lib/error.ts';
import { fetchTopicReactions, LikeType } from '@app/lib/like.ts';
import { turnstile } from '@app/lib/services/turnstile.ts';
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
    mainID: number,
    auth: Readonly<IAuth>,
    body: req.ICreateEpisodeComment,
  ): Promise<{ id: number }> {
    if (!(await turnstile.verify(body.turnstileToken))) {
      throw new CaptchaError();
    }
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
        .where(op.eq(this.table.id, body.replyTo));
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
}
