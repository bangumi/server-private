import { DateTime } from 'luxon';
import { beforeEach, describe, expect, test } from 'vitest';

import * as Subject from './index.ts';
import { db, op, schema } from '@app/drizzle/db.ts';

describe('should update subject', () => {
  beforeEach(async () => {
    await db
      .update(schema.chiiSubjects)
      .set({ nsfw: true })
      .where(op.eq(schema.chiiSubjects.id, 363612));
    await db.delete(schema.chiiSubjectRev).where(op.eq(schema.chiiSubjectRev.subjectID, 363612));
  });

  test('should update subject', async () => {
    const now = DateTime.now();

    await Subject.edit({
      subjectID: 363612,
      name: 'q',
      infobox: '{{Infobox q }}',
      summary: 'summary summary 2',
      userID: 2,
      metaTags: ['热血', '短片'],
      platform: 3,
      date: '1997-11-11',
      commitMessage: 'cm',
      now,
    });

    const [row] = await db
      .select()
      .from(schema.chiiSubjects)
      .innerJoin(
        schema.chiiSubjectFields,
        op.eq(schema.chiiSubjects.id, schema.chiiSubjectFields.id),
      )
      .where(op.eq(schema.chiiSubjects.id, 363612))
      .limit(1);

    expect(row).toMatchInlineSnapshot(`
      Object {
        "chii_subject_fields": Object {
          "date": "1997-11-11",
          "fieldAirtime": 0,
          "fieldRank": 0,
          "fieldRate1": 2,
          "fieldRate10": 1,
          "fieldRate2": 0,
          "fieldRate3": 0,
          "fieldRate4": 0,
          "fieldRate5": 0,
          "fieldRate6": 0,
          "fieldRate7": 1,
          "fieldRate8": 1,
          "fieldRate9": 0,
          "fieldRedirect": 0,
          "fieldTags": "a:6:{i:0;a:2:{s:8:"tag_name";s:12:"开放世界";s:6:"result";s:1:"2";}i:1;a:2:{s:8:"tag_name";s:12:"2021年12月";s:6:"result";s:1:"2";}i:2;a:2:{s:8:"tag_name";s:6:"原创";s:6:"result";s:1:"2";}i:3;a:2:{s:8:"tag_name";s:10:"2021.12.26";s:6:"result";s:1:"1";}i:4;a:2:{s:8:"tag_name";s:6:"沙盒";s:6:"result";s:1:"1";}i:5;a:2:{s:8:"tag_name";s:2:"TV";s:6:"result";s:1:"1";}}",
          "fieldTid": 2,
          "id": 363612,
          "month": 11,
          "weekDay": 5,
          "year": 1997,
        },
        "chii_subjects": Object {
          "Uid": "",
          "airtime": 0,
          "ban": 0,
          "createdAt": 1640456969,
          "creatorID": 287622,
          "doing": 1,
          "done": 7,
          "dropped": 0,
          "eps": 0,
          "field5": "",
          "id": 363612,
          "idxCn": "s",
          "image": "82/15/363612_6uauA.jpg",
          "infobox": "{{Infobox q }}",
          "metaTags": "热血 短片",
          "name": "q",
          "nameCN": "",
          "nsfw": true,
          "onHold": 1,
          "platform": 3,
          "series": 0,
          "seriesEntry": 0,
          "summary": "summary summary 2",
          "typeID": 2,
          "volumes": 0,
          "wish": 0,
        },
      }
    `);

    const [rev] = await db
      .select()
      .from(schema.chiiSubjectRev)
      .where(op.eq(schema.chiiSubjectRev.subjectID, 363612));

    expect(rev).toMatchObject({
      commitMessage: 'cm',
      createdAt: expect.any(Number),
      creatorID: 2,
      eps: 0,
      infobox: '{{Infobox q }}',
      name: 'q',
      metaTags: '热血 短片',
      nameCN: '',
      platform: 3,
      revId: expect.any(Number),
      revVoteField: '',
      subjectID: 363612,
      summary: 'summary summary 2',
      type: 1,
      typeID: 2,
    });
  });

  test('invalid tags', async () => {
    await expect(
      Subject.edit({
        subjectID: 363612,
        name: 'q',
        infobox: '{{Infobox q }}',
        summary: 'summary summary 2',
        userID: 2,
        metaTags: ['a-tag-should-not-exists', '短片'],
        platform: 3,
        date: '1997-11-11',
        commitMessage: 'cm',
        now: DateTime.now(),
      }),
    ).rejects.toMatchObject({
      message: expect.stringMatching(/.*"a-tag-should-not-exists" is not allowed meta tags.*/g),
    });
  });
});
