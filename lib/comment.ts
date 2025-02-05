import { db, op } from '@app/drizzle/db';
import * as schema from '@app/drizzle/schema';
import { fetchTopicReactions, LikeType } from '@app/lib/like.ts';
import * as fetcher from '@app/lib/types/fetcher.ts';
import type * as res from '@app/lib/types/res.ts';

export enum CommentType {
  Episode = 1,
  Character = 2,
  Person = 3,
  Index = 4,
  Blog = 5,
  Timeline = 6,
}

const commentTables = {
  [CommentType.Episode]: schema.chiiEpComments,
  [CommentType.Character]: schema.chiiCrtComments,
  [CommentType.Person]: schema.chiiPrsnComments,
  [CommentType.Index]: schema.chiiIndexComments,
  [CommentType.Blog]: schema.chiiBlogComments,
  [CommentType.Timeline]: schema.chiiTimelineComments,
};

function getCommentTable(type: CommentType) {
  return commentTables[type];
}

export class Comment {
  private readonly type: CommentType;

  constructor(type: CommentType) {
    this.type = type;
  }

  async getAll(mainID: number) {
    const table = getCommentTable(this.type);
    const data = await db.select().from(table).where(op.eq(table.mid, mainID));
    const uids = data.map((v) => v.uid);
    const users = await fetcher.fetchSlimUsersByIDs(uids);

    const comments: res.IComment[] = [];
    const replies: Record<number, res.ICommentBase[]> = {};

    let allReactions: Record<number, res.IReaction[]> = {};
    if (this.type === CommentType.Episode) {
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
