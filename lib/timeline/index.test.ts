import { test } from 'vitest';

import { TimelineRepo } from '../orm';
import { timeline } from './index';

test('fetch all', async () => {
  const timelines = await TimelineRepo.find();
  for (const tl of timelines) {
    const t = timeline.convertFromOrm(tl);
    timeline.validate(t);
  }
});
