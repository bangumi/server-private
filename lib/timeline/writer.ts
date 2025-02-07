import * as php from '@trim21/php-serialize';
import * as lo from 'lodash-es';
import { DateTime } from 'luxon';

import { db, op } from '@app/drizzle/db';
import * as schema from '@app/drizzle/schema';
import { BadRequestError, UnexpectedNotFoundError } from '@app/lib/error.ts';
import { CollectionType, EpisodeCollectionStatus, SubjectType } from '@app/lib/subject/type';

import type * as memo from './memo';
import { TimelineCat, TimelineSource, TimelineStatusType } from './type';

export class TimelineWriter {
  /**
   * 收藏条目
   *
   * @param uid - 用户ID
   * @param sid - 条目ID
   * @returns 时间线 ID
   */
  async subject(uid: number, sid: number): Promise<number> {
    const [subject] = await db
      .select()
      .from(schema.chiiSubjects)
      .where(op.eq(schema.chiiSubjects.id, sid))
      .limit(1);
    if (!subject) {
      throw new UnexpectedNotFoundError('subject not found');
    }
    const [interest] = await db
      .select()
      .from(schema.chiiSubjectInterests)
      .where(
        op.and(
          op.eq(schema.chiiSubjectInterests.uid, uid),
          op.eq(schema.chiiSubjectInterests.subjectID, sid),
          op.ne(schema.chiiSubjectInterests.type, 0),
        ),
      )
      .limit(1);
    if (!interest) {
      throw new UnexpectedNotFoundError('interest not found');
    }

    const type = switchSubjectType(interest.type, subject.typeID);
    const [previous] = await db
      .select()
      .from(schema.chiiTimeline)
      .where(
        op.and(
          op.eq(schema.chiiTimeline.uid, uid),
          op.eq(schema.chiiTimeline.cat, TimelineCat.Subject),
          op.eq(schema.chiiTimeline.type, type),
        ),
      )
      .orderBy(op.desc(schema.chiiTimeline.id))
      .limit(1);

    const detail: memo.Subject = {
      subject_id: sid.toString(),
      collect_id: interest.id,
      collect_comment: lo.escape(interest.comment),
      collect_rate: interest.rate,
    };

    if (previous && previous.createdAt > DateTime.now().minus({ minutes: 10 }).toUnixInteger()) {
      const details: memo.SubjectBatch = {};
      if (previous.batch) {
        const info = php.parse(previous.memo) as memo.SubjectBatch;
        for (const [id, subject] of Object.entries(info)) {
          details[Number(id)] = subject;
        }
      } else {
        const info = php.parse(previous.memo) as memo.Subject;
        details[Number(info.subject_id)] = info;
      }
      details[Number(detail.subject_id)] = detail;
      await db
        .update(schema.chiiTimeline)
        .set({
          batch: true,
          memo: php.stringify(details),
          source: TimelineSource.Next,
        })
        .where(op.eq(schema.chiiTimeline.id, previous.id))
        .limit(1);
      return previous.id;
    } else {
      const [result] = await db.insert(schema.chiiTimeline).values({
        uid,
        cat: TimelineCat.Subject,
        type,
        related: sid.toString(),
        memo: php.stringify(detail),
        img: '',
        batch: false,
        source: TimelineSource.Next,
        replies: 0,
        createdAt: DateTime.now().toUnixInteger(),
      });
      return result.insertId;
    }
  }

  /**
   * 进度 - 剧集
   *
   * @param uid - 用户ID
   * @param sid - 条目ID
   * @param eid - 集数ID
   * @param status - 状态
   * @returns 时间线 ID
   */
  async progressEpisode(
    uid: number,
    sid: number,
    eid: number,
    status: EpisodeCollectionStatus,
  ): Promise<number> {
    if (status === EpisodeCollectionStatus.None) {
      throw new BadRequestError('episode status is none');
    }
    const [subject] = await db
      .select()
      .from(schema.chiiSubjects)
      .where(op.eq(schema.chiiSubjects.id, sid))
      .limit(1);
    if (!subject) {
      throw new UnexpectedNotFoundError('subject not found');
    }
    const detail: memo.ProgressSingle = {
      subject_id: sid.toString(),
      subject_type_id: subject.typeID.toString(),
      ep_id: eid,
    };
    const [previous] = await db
      .select()
      .from(schema.chiiTimeline)
      .where(
        op.and(
          op.eq(schema.chiiTimeline.uid, uid),
          op.eq(schema.chiiTimeline.cat, TimelineCat.Progress),
        ),
      )
      .orderBy(op.desc(schema.chiiTimeline.id))
      .limit(1);
    if (
      previous &&
      previous.createdAt > DateTime.now().minus({ minutes: 15 }).toUnixInteger() &&
      Number(previous.related) === sid &&
      !previous.batch &&
      previous.type === status
    ) {
      await db
        .update(schema.chiiTimeline)
        .set({
          memo: php.stringify(detail),
          source: TimelineSource.Next,
        })
        .where(op.eq(schema.chiiTimeline.id, previous.id))
        .limit(1);
      return previous.id;
    } else {
      const [result] = await db.insert(schema.chiiTimeline).values({
        uid,
        cat: TimelineCat.Progress,
        type: status,
        related: sid.toString(),
        memo: php.stringify(detail),
        img: '',
        batch: false,
        source: TimelineSource.Next,
        replies: 0,
        createdAt: DateTime.now().toUnixInteger(),
      });
      return result.insertId;
    }
  }

  /**
   * 进度 - 条目
   *
   * @param uid - 用户ID
   * @param sid - 条目ID
   * @param epsUpdate - 话数更新
   * @param volsUpdate - 卷数更新
   * @returns 时间线 ID
   */
  async progressSubject(uid: number, sid: number, epsUpdate?: number, volsUpdate?: number) {
    const [subject] = await db
      .select()
      .from(schema.chiiSubjects)
      .where(op.eq(schema.chiiSubjects.id, sid))
      .limit(1);
    if (!subject) {
      throw new UnexpectedNotFoundError('subject not found');
    }
    const detail: memo.ProgressBatch = {
      subject_id: sid.toString(),
      subject_type_id: subject.typeID.toString(),
      eps_total: subject.eps === 0 ? '??' : subject.eps.toString(),
      eps_update: epsUpdate,
      vols_total: subject.volumes === 0 ? '??' : subject.volumes.toString(),
      vols_update: volsUpdate,
    };
    const [previous] = await db
      .select()
      .from(schema.chiiTimeline)
      .where(
        op.and(
          op.eq(schema.chiiTimeline.uid, uid),
          op.eq(schema.chiiTimeline.cat, TimelineCat.Progress),
          op.eq(schema.chiiTimeline.type, 0),
        ),
      )
      .limit(1);
    if (previous && previous.createdAt > DateTime.now().minus({ minutes: 15 }).toUnixInteger()) {
      await db
        .update(schema.chiiTimeline)
        .set({
          memo: php.stringify(detail),
          source: TimelineSource.Next,
        })
        .where(op.eq(schema.chiiTimeline.id, previous.id))
        .limit(1);
      return previous.id;
    } else {
      const [result] = await db.insert(schema.chiiTimeline).values({
        uid,
        cat: TimelineCat.Progress,
        type: 0,
        related: sid.toString(),
        memo: php.stringify(detail),
        img: '',
        batch: false,
        source: TimelineSource.Next,
        replies: 0,
        createdAt: DateTime.now().toUnixInteger(),
      });
      return result.insertId;
    }
  }

  /**
   * 状态 - 吐槽
   *
   * @param uid - 用户ID
   * @param text - 吐槽内容
   * @returns 时间线 ID
   */
  async statusTsukkomi(uid: number, text: string) {
    const [result] = await db.insert(schema.chiiTimeline).values({
      uid,
      cat: TimelineCat.Status,
      type: TimelineStatusType.Tsukkomi,
      related: '',
      memo: text,
      img: '',
      batch: false,
      source: TimelineSource.Next,
      replies: 0,
      createdAt: DateTime.now().toUnixInteger(),
    });
    return result.insertId;
  }
}

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
