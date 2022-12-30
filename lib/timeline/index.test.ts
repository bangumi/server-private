import * as typeorm from 'typeorm';
import { expect, test } from 'vitest';

import { TimelineRepo } from '@app/lib/orm';
import type { Timeline } from '@app/lib/orm/entity';

import * as timeline from './index';

test('fetch all', async () => {
  let looped = false;
  let timelines: Timeline[];
  let lastID = 0;

  do {
    timelines = await TimelineRepo.find({
      take: 1000,
      order: { id: 'asc' },
      where: { id: typeorm.MoreThan(lastID) },
    });

    looped = true;
    for (const tl of timelines) {
      lastID = tl.id;
      const t = timeline.convertFromOrm(tl);
      if (t) {
        timeline.validate(t);
      }
    }
  } while (timelines.length > 0);

  expect(looped).toBe(true);
});
