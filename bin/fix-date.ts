import * as console from 'node:console';

import * as wiki from '@bgm38/wiki';

import { db, op, schema } from '@app/drizzle';
import { extractDate } from '@app/lib/subject/date.ts';

async function main() {
  const step = 1000;

  let start = 0;

  for (;;) {
    const fields = await db
      .select()
      .from(schema.chiiSubjectFields)
      .where(
        op.and(op.eq(schema.chiiSubjectFields.year, 0), op.gt(schema.chiiSubjectFields.id, start)),
      )
      .orderBy(schema.chiiSubjectFields.id)
      .limit(step);

    if (fields.length === 0) {
      return;
    }

    start = fields.at(-1)?.id ?? start;

    for (const s of fields) {
      const [subject] = await db
        .select()
        .from(schema.chiiSubjects)
        .where(op.and(op.eq(schema.chiiSubjects.id, s.id), op.eq(schema.chiiSubjects.ban, 0)))
        .limit(1);
      if (!subject) {
        continue;
      }

      let info: wiki.Wiki;
      try {
        info = wiki.parse(subject.infobox);
      } catch {
        continue;
      }

      const date = extractDate(info, subject.typeID, subject.platform);
      if (date.year === 0) {
        continue;
      }

      if (date.year <= 1900) {
        continue;
      }

      console.log(s.id, date);

      await db
        .update(schema.chiiSubjectFields)
        .set({
          year: date.year,
          month: date.month,
          date: date.toString(),
        })
        .where(op.eq(schema.chiiSubjectFields.id, s.id));
    }
  }
}

await main();
