import * as php from '@trim21/php-serialize';
import * as lo from 'lodash-es';
import { DateTime } from 'luxon';

import { db, op } from '@app/drizzle/db';
import type * as orm from '@app/drizzle/orm';
import * as schema from '@app/drizzle/schema';
import { CollectionType, SubjectType } from '@app/lib/subject/type';

import type * as memo from './memo';
import { TimelineCat, TimelineSource } from './type';

export class TimelineWriter {
  async subject(uid: number, sid: number) {
    const [subject] = await db
      .select()
      .from(schema.chiiSubjects)
      .where(op.eq(schema.chiiSubjects.id, sid))
      .limit(1);
    if (!subject) {
      return;
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
      return;
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
      await this.subjectBatch(previous, detail);
    } else {
      await this.subjectSingle(uid, sid, type, detail);
    }
  }

  private async subjectSingle(uid: number, sid: number, type: number, detail: memo.Subject) {
    await db.insert(schema.chiiTimeline).values({
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
  }

  private async subjectBatch(previous: orm.ITimeline, detail: memo.Subject) {
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
