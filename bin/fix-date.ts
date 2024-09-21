import * as console from 'node:console';

import * as wiki from '@bgm38/wiki';

import { AppDataSource, SubjectFieldsRepo, SubjectRepo } from '@app/lib/orm';
import { extractDate } from '@app/lib/subject/date.ts';

async function main() {
  await AppDataSource.initialize();

  const step = 1000;

  let start = 0;

  for (;;) {
    const fields = await SubjectFieldsRepo.createQueryBuilder('t')
      .where('t.year = :year and t.subject_id > :start', {
        year: 0,
        start: start,
      })
      .take(step)
      .orderBy('t.subject_id')
      .getMany();

    if (fields.length === 0) {
      return;
    }

    start = fields.at(-1)?.subjectID ?? start;

    for (const s of fields) {
      const subject = await SubjectRepo.findOne({ where: { id: s.subjectID, subjectBan: 0 } });
      if (!subject) {
        continue;
      }

      let info: wiki.Wiki;
      try {
        info = wiki.parse(subject.fieldInfobox);
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

      console.log(s.subjectID, date);

      await SubjectFieldsRepo.update(
        {
          subjectID: s.subjectID,
        },
        {
          year: date.year,
          month: date.month,
          date: date.toString(),
        },
      );
    }
  }
}

await main();
