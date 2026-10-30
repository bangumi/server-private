import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { db, op, schema } from '@app/drizzle';

import { refreshSubjectDates } from './subject-date.ts';

const WITH_DATE_ID = 16_000_001;
const WITHOUT_DATE_ID = 16_000_002;

async function insertSubject(id: number, infobox: string) {
  await db.insert(schema.chiiSubjects).values({
    id,
    typeID: 1,
    name: `test-${id}`,
    nameCN: '',
    Uid: '',
    creatorID: 2,
    createdAt: 0,
    image: '',
    platform: 0,
    metaTags: '',
    infobox,
    summary: '',
    field5: '',
    volumes: 0,
    eps: 0,
    series: false,
    idxCN: '',
    airtime: 0,
    nsfw: false,
    ban: 0,
  });

  await db.insert(schema.chiiSubjectFields).values({
    id,
    tid: 0,
    tags: '',
    rate1: 0,
    rate2: 0,
    rate3: 0,
    rate4: 0,
    rate5: 0,
    rate6: 0,
    rate7: 0,
    rate8: 0,
    rate9: 0,
    rate10: 0,
    airtime: 0,
    year: 1999,
    month: 1,
    weekday: 0,
    date: '1999-01-01',
    redirect: 0,
  });
}

async function deleteSubjects() {
  for (const id of [WITH_DATE_ID, WITHOUT_DATE_ID]) {
    await db.delete(schema.chiiSubjectFields).where(op.eq(schema.chiiSubjectFields.id, id));
    await db.delete(schema.chiiSubjects).where(op.eq(schema.chiiSubjects.id, id));
  }
}

describe('refresh subject dates', () => {
  beforeEach(async () => {
    await deleteSubjects();

    await insertSubject(WITH_DATE_ID, '{{Infobox animanga/Novel\n|发售日= 2020-01-02\n}}');
    await insertSubject(WITHOUT_DATE_ID, '{{Infobox animanga/Novel\n|发售日=\n}}');
  });

  afterEach(async () => {
    await deleteSubjects();
  });

  test('should rescan date from infobox and keep unparsable date', async () => {
    await refreshSubjectDates({ startID: WITH_DATE_ID - 1, endID: WITHOUT_DATE_ID });

    const [withDate] = await db
      .select()
      .from(schema.chiiSubjectFields)
      .where(op.eq(schema.chiiSubjectFields.id, WITH_DATE_ID));
    expect(withDate).toMatchObject({ year: 2020, month: 1, date: '2020-01-02' });

    const [withoutDate] = await db
      .select()
      .from(schema.chiiSubjectFields)
      .where(op.eq(schema.chiiSubjectFields.id, WITHOUT_DATE_ID));
    expect(withoutDate).toMatchObject({ year: 1999, month: 1, date: '1999-01-01' });
  });
});
