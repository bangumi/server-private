/* eslint-disable no-console */
import * as typeorm from 'typeorm';

import { logger } from '@app/lib/logger';
import { AppDataSource, TimelineRepo } from '@app/lib/orm';
import type { Timeline } from '@app/lib/orm/entity';
import * as timeline from '@app/lib/timeline';

await AppDataSource.initialize();

let timelines: Timeline[];
let lastID = 11653618;

do {
  timelines = await TimelineRepo.find({
    take: 200,
    order: { id: 'asc' },
    where: { id: typeorm.MoreThan(lastID) },
  });

  for (const tl of timelines) {
    lastID = tl.id;

    if ([9305896, 10697159, 11731732].includes(lastID)) {
      continue;
    }

    let t;
    try {
      t = timeline.convertFromOrm(tl);
    } catch (error: unknown) {
      if (error instanceof Error && error.message.endsWith('while unserializing payload')) {
        logger.info(`bad timeline ${tl.id}`);
        continue;
      }
      throw error;
    }
    if (t) {
      timeline.validate(t);
    }
  }

  if (0 === Math.trunc(lastID / 200) % 1000) {
    logger.info({ lastID });
  }
} while (timelines.length > 0);

await AppDataSource.destroy();
