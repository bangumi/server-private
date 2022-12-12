import { test } from 'vitest';

import prisma from '../prisma';
import { timeline } from './index';

test('fetch all', async () => {
  const timelines = await prisma.timeline.findMany();
  for (const tl of timelines) {
    const t = timeline.convertFromOrm(tl);
    timeline.validate(t);
  }
});
