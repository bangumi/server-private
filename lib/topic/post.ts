import { DateTime } from 'luxon';

import type { orm, schema } from '@app/drizzle';
import { db, op } from '@app/drizzle';
import type { IAuth } from '@app/lib/auth/index.ts';
import { NotAllowedError } from '@app/lib/auth/index.ts';
import { Dam } from '@app/lib/dam.ts';
import { BadRequestError, NotFoundError, UnexpectedNotFoundError } from '@app/lib/error.ts';
import type { LikeType } from '@app/lib/like';
import { Reaction } from '@app/lib/like';
import type { NotifyType } from '@app/lib/notify.ts';
import { Notify } from '@app/lib/notify.ts';
import * as fetcher from '@app/lib/types/fetcher.ts';
import type * as res from '@app/lib/types/res.ts';
import { LimitAction } from '@app/lib/utils/rate-limit';
import { rateLimit } from '@app/routes/hooks/rate-limit';

import { CanViewTopicReply } from './display';
import { canReplyPost } from './state.ts';
import { CommentState } from './type.ts';

type PostTable = typeof schema.chiiGroupPosts | typeof schema.chiiSubjectPosts;

type TopicTable = typeof schema.chiiGroupTopics | typeof schema.chiiSubjectTopics;

type PostRow<PT extends PostTable> = PT['$inferSelect'];

type TopicRow<TT extends TopicTable> = TT['$inferSelect'];

type AnyPostRow = orm.IGroupPost | orm.ISubjectPost;

type ReplyLikeType = (typeof LikeType)['GroupReply'] | (typeof LikeType)['SubjectReply'];

interface NotifyTypesConfig {
  /** 回复主楼的站内信类型 */
  topicReply: NotifyType;
  /** 回复回帖的站内信类型 */
  postReply: NotifyType;
}

interface TopicPostServiceOptions<
  PT extends PostTable = PostTable,
  TT extends TopicTable = TopicTable,
> {
  /** 回复所在的 posts 表（chii_group_posts / chii_subject_posts） */
  table: PT;
  /** 回复所属的 topics 表 */
  topicTable: TT;
  /** 回复点赞使用的 LikeType */
  likeType: ReplyLikeType;
  notifyTypes: NotifyTypesConfig;
}

/**
 * Group / subject 话题回复（post）的通用服务。
 *
 * 两张 posts 表结构一致，仅 likeType / notify 类型 / 计数器副作用不同， 通过构造参数区分，避免 group.ts 与 subject.ts 中重复的回复 CRUD
 * 实现。
 */
export class TopicPostService<
  PT extends PostTable = PostTable,
  TT extends TopicTable = TopicTable,
> {
  private readonly table: PostTable;
  private readonly topicTable: TopicTable;
  private readonly likeType: ReplyLikeType;
  private readonly notifyTypes: NotifyTypesConfig;

  constructor(options: TopicPostServiceOptions<PT, TT>) {
    this.table = options.table;
    this.topicTable = options.topicTable;
    this.likeType = options.likeType;
    this.notifyTypes = options.notifyTypes;
  }

  private toReplyBase(post: AnyPostRow): res.IReplyBase {
    return {
      id: post.id,
      content: post.content,
      state: post.state,
      createdAt: post.createdAt,
      creatorID: post.uid,
    };
  }

  /** 获取话题的回复列表（含一层嵌套回复，主楼是 related === 0 的首条）。 */
  async getReplies(topicID: number, viewerID?: number): Promise<res.IReply[]> {
    const posts = await db
      .select()
      .from(this.table)
      .where(op.eq(this.table.mid, topicID))
      .orderBy(op.asc(this.table.id));
    const users = await fetcher.fetchSlimUsersByIDs(
      posts.map((x) => x.uid),
      viewerID,
    );
    const subReplies: Record<number, res.IReplyBase[]> = {};
    const reactions = await Reaction.fetchByMainID(topicID, this.likeType);
    for (const x of posts) {
      if (x.related === 0) {
        continue;
      }
      if (!CanViewTopicReply(x.state)) {
        x.content = '';
      }
      const sub = this.toReplyBase(x);
      sub.creator = users[sub.creatorID];
      sub.reactions = reactions[x.id] ?? [];
      const subR = subReplies[x.related] ?? [];
      subR.push(sub);
      subReplies[x.related] = subR;
    }
    const topLevelReplies: res.IReply[] = [];
    for (const x of posts) {
      if (x.related !== 0) {
        continue;
      }
      if (!CanViewTopicReply(x.state)) {
        x.content = '';
      }
      const reply = {
        ...this.toReplyBase(x),
        creator: users[x.uid],
        replies: subReplies[x.id] ?? [],
        reactions: reactions[x.id] ?? [],
      };
      topLevelReplies.push(reply);
    }
    return topLevelReplies;
  }

  /** 获取单个回复详情所需的 post / topic / 用户数据。 */
  async getPost(
    postID: number,
    viewerID?: number,
  ): Promise<{
    post: PostRow<PT>;
    topic: TopicRow<TT>;
    creator: res.ISlimUser;
    topicCreator: res.ISlimUser;
  }> {
    const [post] = await db.select().from(this.table).where(op.eq(this.table.id, postID)).limit(1);
    if (!post) {
      throw new NotFoundError(`post ${postID}`);
    }
    const [topic] = await db
      .select()
      .from(this.topicTable)
      .where(op.eq(this.topicTable.id, post.mid))
      .limit(1);
    if (!topic) {
      throw new UnexpectedNotFoundError(`topic ${post.mid}`);
    }
    const users = await fetcher.fetchSlimUsersByIDs([post.uid, topic.uid], viewerID);
    const creator = users[post.uid];
    if (!creator) {
      throw new UnexpectedNotFoundError(`user ${post.uid}`);
    }
    const topicCreator = users[topic.uid];
    if (!topicCreator) {
      throw new UnexpectedNotFoundError(`user ${topic.uid}`);
    }
    return { post, topic, creator, topicCreator };
  }

  /**
   * 创建回复。
   *
   * @param topic - 已由路由取出的 topic 行（路由还需要它做组权限等检查）
   * @param preCreateCheck - 插入前的额外检查（如私密小组的成员校验），在关闭话题检查之后执行
   */
  async create(
    auth: Readonly<IAuth>,
    topic: TopicRow<TT>,
    content: string,
    replyTo: number,
    preCreateCheck?: (topic: TopicRow<TT>) => Promise<void>,
  ): Promise<{ id: number }> {
    if (auth.permission.ban_post) {
      throw new NotAllowedError('create reply');
    }
    if (!Dam.allCharacterPrintable(content)) {
      throw new BadRequestError('content contains invalid invisible character');
    }
    if (topic.state === CommentState.AdminCloseTopic) {
      throw new NotAllowedError('reply to a closed topic');
    }
    await preCreateCheck?.(topic);

    let notifyUserID = topic.uid;
    if (replyTo) {
      const [parent] = await db
        .select()
        .from(this.table)
        .where(op.eq(this.table.id, replyTo))
        .limit(1);
      if (!parent) {
        throw new NotFoundError(`post ${replyTo}`);
      }
      if (!canReplyPost(parent.state)) {
        throw new NotAllowedError('reply to a admin action post');
      }
      notifyUserID = parent.uid;
    }

    await rateLimit(LimitAction.Reply, auth.userID);

    const createdAt = DateTime.now().toUnixInteger();

    let postID = 0;
    await db.transaction(async (t) => {
      const [{ count = 0 } = {}] = await t
        .select({ count: op.count() })
        .from(this.table)
        .where(
          op.and(op.eq(this.table.mid, topic.id), op.eq(this.table.state, CommentState.Normal)),
        );
      const [{ insertId }] = await t.insert(this.table).values({
        mid: topic.id,
        uid: auth.userID,
        related: replyTo,
        content,
        state: CommentState.Normal,
        createdAt,
      });
      postID = insertId;

      if (topic.state === CommentState.AdminSilentTopic) {
        await t
          .update(this.topicTable)
          .set({ replies: count })
          .where(op.eq(this.topicTable.id, topic.id));
      } else {
        await t
          .update(this.topicTable)
          .set({ replies: count, updatedAt: createdAt })
          .where(op.eq(this.topicTable.id, topic.id));
      }

      await Notify.create(t, {
        destUserID: notifyUserID,
        sourceUserID: auth.userID,
        createdAt,
        type: replyTo === 0 ? this.notifyTypes.topicReply : this.notifyTypes.postReply,
        relatedID: postID,
        mainID: topic.id,
        title: topic.title,
      });
    });

    return { id: postID };
  }

  async update(auth: Readonly<IAuth>, postID: number, content: string): Promise<void> {
    if (auth.permission.ban_post) {
      throw new NotAllowedError('edit reply');
    }
    if (!Dam.allCharacterPrintable(content)) {
      throw new BadRequestError('content contains invalid invisible character');
    }

    const [post] = await db.select().from(this.table).where(op.eq(this.table.id, postID)).limit(1);
    if (!post) {
      throw new NotFoundError(`post ${postID}`);
    }
    if (post.uid !== auth.userID) {
      throw new NotAllowedError('edit reply not created by you');
    }

    const [topic] = await db
      .select()
      .from(this.topicTable)
      .where(op.eq(this.topicTable.id, post.mid))
      .limit(1);
    if (!topic) {
      throw new UnexpectedNotFoundError(`topic ${post.mid}`);
    }
    if (topic.state === CommentState.AdminCloseTopic) {
      throw new NotAllowedError('edit reply in a closed topic');
    }
    if (([CommentState.AdminDelete, CommentState.UserDelete] as number[]).includes(post.state)) {
      throw new NotAllowedError('edit a deleted reply');
    }

    const [reply] = await db
      .select()
      .from(this.table)
      .where(op.and(op.eq(this.table.mid, topic.id), op.eq(this.table.related, postID)))
      .limit(1);
    if (reply) {
      throw new NotAllowedError('edit a post with reply');
    }

    await rateLimit(LimitAction.Reply, auth.userID);
    await db.update(this.table).set({ content }).where(op.eq(this.table.id, postID));
  }

  async delete(auth: Readonly<IAuth>, postID: number): Promise<void> {
    const [post] = await db.select().from(this.table).where(op.eq(this.table.id, postID)).limit(1);
    if (!post) {
      throw new NotFoundError(`post ${postID}`);
    }
    if (post.uid !== auth.userID) {
      throw new NotAllowedError('delete reply not created by you');
    }
    await rateLimit(LimitAction.Reply, auth.userID);
    await db
      .update(this.table)
      .set({ state: CommentState.UserDelete })
      .where(op.eq(this.table.id, postID));
  }

  async like(auth: Readonly<IAuth>, postID: number, value: number): Promise<void> {
    const [post] = await db
      .select({ mid: this.table.mid })
      .from(this.table)
      .where(op.eq(this.table.id, postID))
      .limit(1);
    if (!post) {
      throw new NotFoundError(`post ${postID}`);
    }
    await Reaction.add({
      type: this.likeType,
      mid: post.mid,
      rid: postID,
      uid: auth.userID,
      value,
    });
  }

  async unlike(auth: Readonly<IAuth>, postID: number): Promise<void> {
    await Reaction.delete({
      type: this.likeType,
      rid: postID,
      uid: auth.userID,
    });
  }
}
