import * as console from 'node:console';

import * as wiki from '@bgm38/wiki';
import { Between } from 'typeorm';

import { AppDataSource, SubjectFieldsRepo, SubjectRepo } from '@app/lib/orm';
import { extractDate } from '@app/lib/subject/date.ts';

async function main() {
  await AppDataSource.initialize();

  const step = 1000;

  for (let i = 0; i <= 600000; i += step) {
    const fields = await SubjectFieldsRepo.find({
      where: {
        year: 0,
        subject_id: Between(i, i + step),
      },
      order: { subject_id: 'asc' },
      take: step,
    });

    for (const s of fields) {
      const subject = await SubjectRepo.findOne({ where: { id: s.subject_id, subjectBan: 0 } });
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

      console.log(s.subject_id, date);

      await SubjectFieldsRepo.update(
        {
          subject_id: s.subject_id,
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
