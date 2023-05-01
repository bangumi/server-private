import { expect, test } from 'vitest';

import { AppDataSource } from '@app/lib/orm';

import { pushRev } from './ep.ts';

test('get episode rev', async () => {
  // const r = await getRev(15, 8);
  // expect(r).toMatchInlineSnapshot('Array []');
  await AppDataSource.transaction(async (t) => {
    await expect(
      pushRev(t, {
        episodeID: 8,
        rev: {
          ep_airdate: '1234-08-10',
          ep_desc: 'description',
          ep_duration: '20:10',
          ep_name: 'n',
          ep_name_cn: 'nnn',
          ep_sort: '0',
          ep_type: '0',
        },
        creator: 1,
        now: new Date(),
        comment: 'test',
      }),
    ).resolves.toMatchInlineSnapshot('undefined');
  });
});
