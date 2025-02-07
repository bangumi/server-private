import * as php from '@trim21/php-serialize';
import * as lo from 'lodash-es';
import { DateTime } from 'luxon';

import { db, op } from '@app/drizzle/db';
import type * as orm from '@app/drizzle/orm';
import * as schema from '@app/drizzle/schema';
import { UnexpectedNotFoundError } from '@app/lib/error.ts';
import { CollectionType, SubjectType } from '@app/lib/subject/type';

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
      subject_id: sid,
      collect_id: interest.id,
      collect_comment: lo.escape(interest.comment),
      collect_rate: interest.rate,
    };

    if (previous && previous.createdAt > DateTime.now().minus({ minutes: 10 }).toUnixInteger()) {
      return await this.subjectBatch(previous, detail);
    } else {
      return await this.subjectSingle(uid, sid, type, detail);
    }
  }

  private async subjectSingle(
    uid: number,
    sid: number,
    type: number,
    detail: memo.Subject,
  ): Promise<number> {
    const [result] = await db.insert(schema.chiiTimeline).values({
      uid,
      cat: TimelineCat.Subject,
      type,
      related: sid.toString(),
      memo: php.stringify(detail),
      img: '',
      batch: false,
      source: TimelineSource.API,
      replies: 0,
      createdAt: DateTime.now().toUnixInteger(),
    });
    return result.insertId;
  }

  private async subjectBatch(previous: orm.ITimeline, detail: memo.Subject): Promise<number> {
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
    details[detail.subject_id] = detail;
    await db
      .update(schema.chiiTimeline)
      .set({
        batch: true,
        memo: php.stringify(details),
      })
      .where(op.eq(schema.chiiTimeline.id, previous.id))
      .limit(1);
    return previous.id;
  }

  progressEpisode(uid: number, eid: number, sid: number) {
    const _uid = uid;
    const _eid = eid;
    const _sid = sid;
    // message EpisodeCollectRequest {
    //   uint64 user_id = 1;
    //   Episode last = 2;
    //   Subject subject = 3;
    // }
  }

  progressSubject(uid: number, sid: number) {
    const _uid = uid;
    const _sid = sid;
    // message SubjectProgressRequest {
    //   uint64 user_id = 1;
    //   Subject subject = 2;
    //   uint32 eps_update = 3;
    //   uint32 vols_update = 4;
    // }
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
