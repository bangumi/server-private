import { db, op } from '@app/drizzle/db';
import * as schema from '@app/drizzle/schema';
import { fetchTopicReactions, LikeType } from '@app/lib/like.ts';
import * as fetcher from '@app/lib/types/fetcher.ts';
import type * as res from '@app/lib/types/res.ts';

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

  constructor(target: CommentTarget) {
    this.target = target;
  }

  async getAll(mainID: number) {
    const table = commentTables[this.target];
    const data = await db.select().from(table).where(op.eq(table.mid, mainID));
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
}
