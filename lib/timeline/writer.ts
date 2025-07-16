import * as lo from 'lodash-es';

import { db, op, schema } from '@app/drizzle';
import { BadRequestError } from '@app/lib/error.ts';
import { producer } from '@app/lib/kafka';
import { CollectionType, EpisodeCollectionStatus, SubjectType } from '@app/lib/subject/type';
import { decode } from '@app/lib/utils';

import type * as memo from './memo';
import type { TimelineMonoCat, TimelineMonoType } from './type';
import { TimelineCat, TimelineDailyType, TimelineStatusType } from './type';

/**
 * 时间轴消息
 *
 * Key 为 操作类型，是 TimelineCat 的枚举值，或者 append 一个对应 cat 的详细 type
 *
 * Value 为 操作参数
 */
export interface TimelineMessage {
  daily: {
    uid: number;
    type: TimelineDailyType;
    /** Type 操作对应的内容 ID, 如 userID, groupID, edenID 等 */
    mid: number;
    createdAt: number;
    source: number;
  };
  wiki: {
    uid: number;
    subject: {
      id: number;
      type: SubjectType;
    };
    createdAt: number;
    source: number;
  };
  subject: {
    uid: number;
    subject: {
      id: number;
      type: SubjectType;
    };
    collect: {
      id: number;
      type: CollectionType;
      rate: number;
      comment: string;
    };
    createdAt: number;
    source: number;
  };
  progressEpisode: {
    uid: number;
    subject: {
      id: number;
      type: SubjectType;
    };
    episode: {
      id: number;
      status: number;
    };
    createdAt: number;
    source: number;
  };
  progressSubject: {
    uid: number;
    subject: {
      id: number;
      type: SubjectType;
      eps: number;
      volumes: number;
    };
    collect: {
      epsUpdate?: number;
      volsUpdate?: number;
    };
    createdAt: number;
    source: number;
  };
  statusSign: {
    uid: number;
    sign: string;
    createdAt: number;
    source: number;
  };
  statusTsukkomi: {
    uid: number;
    text: string;
    createdAt: number;
    source: number;
  };
  statusNickname: {
    uid: number;
    before: string;
    after: string;
    createdAt: number;
    source: number;
  };
  mono: {
    uid: number;
    cat: TimelineMonoCat;
    type: TimelineMonoType;
    id: number;
    createdAt: number;
    source: number;
  };
}

type TimelineKafkaSender = {
  [T in keyof TimelineMessage]: (message: TimelineMessage[T]) => Promise<void>;
};

/** 写入时间轴的 Kafka Topic */
export const AsyncTimelineWriter: TimelineKafkaSender = new Proxy({} as TimelineKafkaSender, {
  get: (_, op: keyof TimelineMessage) => {
    return async (message: TimelineMessage[typeof op]) => {
      const value = JSON.stringify({ op, message });
      await producer.send('timeline', message.uid.toString(), value);
    };
  },
});

type TimelineDatabaseWriter = {
  [T in keyof TimelineMessage]: (message: TimelineMessage[T]) => Promise<number>;
};

/** 写入时间轴的 MySQL 数据库表 */
export const TimelineWriter: TimelineDatabaseWriter = {
  /** 日常行为 */
  async daily(payload: TimelineMessage['daily']): Promise<number> {
    const params = {
      uid: payload.uid,
      cat: TimelineCat.Daily,
      type: payload.type,
      related: payload.mid.toString(),
      source: payload.source,
      img: '',
      batch: false,
      replies: 0,
      createdAt: payload.createdAt,
    };
    if (payload.type === TimelineDailyType.Mystery || payload.type === TimelineDailyType.Register) {
      const [result] = await db.insert(schema.chiiTimeline).values({
        ...params,
        memo: '',
      });
      return result.insertId;
    }
    interface DetailHandler {
      detail: memo.User | memo.Group | memo.Eden;
      getID(item: unknown): number;
    }
    let detailHandler: DetailHandler;
    switch (payload.type) {
      case TimelineDailyType.AddFriend: {
        detailHandler = {
          detail: { uid: payload.mid },
          getID: (item: unknown) => (item as memo.User).uid,
        };
        break;
      }
      case TimelineDailyType.JoinGroup:
      case TimelineDailyType.CreateGroup: {
        detailHandler = {
          detail: { grp_id: payload.mid },
          getID: (item: unknown) => (item as memo.Group).grp_id,
        };
        break;
      }
      case TimelineDailyType.JoinEden: {
        detailHandler = {
          detail: { eden_id: payload.mid },
          getID: (item: unknown) => (item as memo.Eden).eden_id,
        };
        break;
      }
      default: {
        throw new Error(`Unsupported daily type: ${payload.type}`);
      }
    }
    const detail = detailHandler.detail;
    const [previous] = await db
      .select()
      .from(schema.chiiTimeline)
      .where(
        op.and(
          op.eq(schema.chiiTimeline.uid, payload.uid),
          op.eq(schema.chiiTimeline.cat, TimelineCat.Daily),
          op.eq(schema.chiiTimeline.type, payload.type),
        ),
      )
      .orderBy(op.desc(schema.chiiTimeline.id))
      .limit(1);
    if (previous && previous.createdAt > payload.createdAt - 10 * 60) {
      const details: Record<number, typeof detail> = {};
      if (previous.batch) {
        const info = decode(previous.memo) as Record<number, typeof detail>;
        for (const [id, item] of Object.entries(info)) {
          details[Number(id)] = item;
        }
      } else {
        const info = decode(previous.memo) as typeof detail;
        const previousID = detailHandler.getID(info);
        details[previousID] = info;
      }
      details[Number(payload.mid)] = detail;
      await db
        .update(schema.chiiTimeline)
        .set({
          batch: true,
          memo: JSON.stringify(details),
          source: payload.source,
        })
        .where(op.eq(schema.chiiTimeline.id, previous.id))
        .limit(1);
      return previous.id;
    } else {
      const [result] = await db.insert(schema.chiiTimeline).values({
        ...params,
        memo: JSON.stringify(detail),
      });
      return result.insertId;
    }
  },

  /** 维基操作 */
  async wiki(payload: TimelineMessage['wiki']): Promise<number> {
    const detail: memo.NewSubject = {
      subject_id: payload.subject.id,
    };
    const [result] = await db.insert(schema.chiiTimeline).values({
      uid: payload.uid,
      cat: TimelineCat.Wiki,
      type: payload.subject.type,
      related: payload.subject.id.toString(),
      memo: JSON.stringify(detail),
      img: '',
      batch: false,
      replies: 0,
      createdAt: payload.createdAt,
    });
    return result.insertId;
  },

  /** 收藏条目 */
  async subject(payload: TimelineMessage['subject']): Promise<number> {
    const type = switchSubjectType(payload.collect.type, payload.subject.type);
    const detail: memo.Subject = {
      subject_id: payload.subject.id,
      collect_id: payload.collect.id,
      collect_comment: lo.escape(payload.collect.comment),
      collect_rate: payload.collect.rate,
    };
    const [previous] = await db
      .select()
      .from(schema.chiiTimeline)
      .where(
        op.and(
          op.eq(schema.chiiTimeline.uid, payload.uid),
          op.eq(schema.chiiTimeline.cat, TimelineCat.Subject),
          op.eq(schema.chiiTimeline.type, type),
        ),
      )
      .orderBy(op.desc(schema.chiiTimeline.id))
      .limit(1);
    if (previous && previous.createdAt > payload.createdAt - 10 * 60) {
      const details: memo.SubjectBatch = {};
      if (previous.batch) {
        const info = decode(previous.memo) as memo.SubjectBatch;
        for (const [id, subject] of Object.entries(info)) {
          details[Number(id)] = subject;
        }
      } else {
        const info = decode(previous.memo) as memo.Subject;
        details[Number(info.subject_id)] = info;
      }
      details[Number(detail.subject_id)] = detail;
      await db
        .update(schema.chiiTimeline)
        .set({
          batch: true,
          memo: JSON.stringify(details),
          source: payload.source,
        })
        .where(op.eq(schema.chiiTimeline.id, previous.id))
        .limit(1);
      return previous.id;
    } else {
      const [result] = await db.insert(schema.chiiTimeline).values({
        uid: payload.uid,
        cat: TimelineCat.Subject,
        type,
        related: payload.subject.id.toString(),
        memo: JSON.stringify(detail),
        img: '',
        batch: false,
        source: payload.source,
        replies: 0,
        createdAt: payload.createdAt,
      });
      return result.insertId;
    }
  },

  /** 进度 - 剧集 */
  async progressEpisode(payload: TimelineMessage['progressEpisode']): Promise<number> {
    if (payload.episode.status === EpisodeCollectionStatus.None) {
      throw new BadRequestError('episode status is none');
    }

    const detail: memo.ProgressSingle = {
      subject_id: payload.subject.id,
      subject_type_id: payload.subject.type,
      ep_id: payload.episode.id,
    };
    const [previous] = await db
      .select()
      .from(schema.chiiTimeline)
      .where(
        op.and(
          op.eq(schema.chiiTimeline.uid, payload.uid),
          op.eq(schema.chiiTimeline.cat, TimelineCat.Progress),
        ),
      )
      .orderBy(op.desc(schema.chiiTimeline.id))
      .limit(1);
    if (
      previous &&
      previous.createdAt > payload.createdAt - 10 * 60 &&
      Number(previous.related) === payload.subject.id &&
      previous.type === payload.episode.status
    ) {
      await db
        .update(schema.chiiTimeline)
        .set({
          memo: JSON.stringify(detail),
          source: payload.source,
        })
        .where(op.eq(schema.chiiTimeline.id, previous.id))
        .limit(1);
      return previous.id;
    } else {
      const [result] = await db.insert(schema.chiiTimeline).values({
        uid: payload.uid,
        cat: TimelineCat.Progress,
        type: payload.episode.status,
        related: payload.subject.id.toString(),
        memo: JSON.stringify(detail),
        img: '',
        batch: false,
        source: payload.source,
        replies: 0,
        createdAt: payload.createdAt,
      });
      return result.insertId;
    }
  },

  /** 进度 - 条目 */
  async progressSubject(payload: TimelineMessage['progressSubject']) {
    const detail: memo.ProgressBatch = {
      subject_id: payload.subject.id,
      subject_type_id: payload.subject.type,
      eps_total: payload.subject.eps === 0 ? '??' : payload.subject.eps.toString(),
      eps_update: payload.collect.epsUpdate,
      vols_total: payload.subject.volumes === 0 ? '??' : payload.subject.volumes.toString(),
      vols_update: payload.collect.volsUpdate,
    };
    const [previous] = await db
      .select()
      .from(schema.chiiTimeline)
      .where(
        op.and(
          op.eq(schema.chiiTimeline.uid, payload.uid),
          op.eq(schema.chiiTimeline.cat, TimelineCat.Progress),
          op.eq(schema.chiiTimeline.type, 0),
        ),
      )
      .orderBy(op.desc(schema.chiiTimeline.id))
      .limit(1);
    if (
      previous &&
      previous.createdAt > payload.createdAt - 10 * 60 &&
      Number(previous.related) === payload.subject.id
    ) {
      await db
        .update(schema.chiiTimeline)
        .set({
          memo: JSON.stringify(detail),
          source: payload.source,
        })
        .where(op.eq(schema.chiiTimeline.id, previous.id))
        .limit(1);
      return previous.id;
    } else {
      const [result] = await db.insert(schema.chiiTimeline).values({
        uid: payload.uid,
        cat: TimelineCat.Progress,
        type: 0,
        related: payload.subject.id.toString(),
        memo: JSON.stringify(detail),
        img: '',
        batch: false,
        source: payload.source,
        replies: 0,
        createdAt: payload.createdAt,
      });
      return result.insertId;
    }
  },

  /** 状态 - 签名 */
  async statusSign(payload: TimelineMessage['statusSign']) {
    const [result] = await db.insert(schema.chiiTimeline).values({
      uid: payload.uid,
      cat: TimelineCat.Status,
      type: TimelineStatusType.Sign,
      related: '',
      memo: payload.sign,
      img: '',
      batch: false,
      source: payload.source,
      replies: 0,
      createdAt: payload.createdAt,
    });
    return result.insertId;
  },

  /** 状态 - 吐槽 */
  async statusTsukkomi(payload: TimelineMessage['statusTsukkomi']) {
    const [result] = await db.insert(schema.chiiTimeline).values({
      uid: payload.uid,
      cat: TimelineCat.Status,
      type: TimelineStatusType.Tsukkomi,
      related: '',
      memo: payload.text,
      img: '',
      batch: false,
      source: payload.source,
      replies: 0,
      createdAt: payload.createdAt,
    });
    return result.insertId;
  },

  /** 状态 - 昵称 */
  async statusNickname(payload: TimelineMessage['statusNickname']) {
    const detail: memo.Nickname = {
      before: lo.escape(payload.before),
      after: lo.escape(payload.after),
    };
    const [result] = await db.insert(schema.chiiTimeline).values({
      uid: payload.uid,
      cat: TimelineCat.Status,
      type: TimelineStatusType.Nickname,
      related: '',
      memo: JSON.stringify(detail),
      img: '',
      batch: false,
      source: payload.source,
      replies: 0,
      createdAt: payload.createdAt,
    });
    return result.insertId;
  },

  /** 人物 */
  async mono(payload: TimelineMessage['mono']) {
    const detail: memo.MonoSingle = {
      cat: payload.cat,
      id: payload.id,
    };
    const [previous] = await db
      .select()
      .from(schema.chiiTimeline)
      .where(
        op.and(
          op.eq(schema.chiiTimeline.uid, payload.uid),
          op.eq(schema.chiiTimeline.cat, TimelineCat.Mono),
          op.eq(schema.chiiTimeline.type, payload.type),
        ),
      )
      .orderBy(op.desc(schema.chiiTimeline.id))
      .limit(1);
    if (previous && previous.createdAt > payload.createdAt - 10 * 60) {
      const details: memo.MonoBatch = {};
      if (previous.batch) {
        const info = decode(previous.memo) as memo.MonoBatch;
        for (const [id, mono] of Object.entries(info)) {
          details[Number(id)] = mono;
        }
      } else {
        const info = decode(previous.memo) as memo.MonoSingle;
        details[Number(info.id)] = info;
      }
      details[Number(detail.id)] = detail;
      await db
        .update(schema.chiiTimeline)
        .set({
          batch: true,
          memo: JSON.stringify(details),
          source: payload.source,
        })
        .where(op.eq(schema.chiiTimeline.id, previous.id))
        .limit(1);
      return previous.id;
    } else {
      const [result] = await db.insert(schema.chiiTimeline).values({
        uid: payload.uid,
        cat: TimelineCat.Mono,
        type: payload.type,
        related: payload.id.toString(),
        memo: JSON.stringify(detail),
        img: '',
        batch: false,
        source: payload.source,
        replies: 0,
        createdAt: payload.createdAt,
      });
      return result.insertId;
    }
  },
};

function switchSubjectType(ctype: CollectionType, stype: SubjectType): number {
  switch (stype) {
    case SubjectType.Book: {
      const source = {
        [CollectionType.Wish]: 1,
        [CollectionType.Collect]: 5,
        [CollectionType.Doing]: 9,
        [CollectionType.OnHold]: 13,
        [CollectionType.Dropped]: 14,
      };
      return source[ctype];
    }
    case SubjectType.Anime:
    case SubjectType.Real: {
      const source = {
        [CollectionType.Wish]: 2,
        [CollectionType.Collect]: 6,
        [CollectionType.Doing]: 10,
        [CollectionType.OnHold]: 13,
        [CollectionType.Dropped]: 14,
      };
      return source[ctype];
    }
    case SubjectType.Music: {
      const source = {
        [CollectionType.Wish]: 3,
        [CollectionType.Collect]: 7,
        [CollectionType.Doing]: 11,
        [CollectionType.OnHold]: 13,
        [CollectionType.Dropped]: 14,
      };
      return source[ctype];
    }
    case SubjectType.Game: {
      const source = {
        [CollectionType.Wish]: 4,
        [CollectionType.Collect]: 8,
        [CollectionType.Doing]: 12,
        [CollectionType.OnHold]: 13,
        [CollectionType.Dropped]: 14,
      };
      return source[ctype];
    }
  }
}
