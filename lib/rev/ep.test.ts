import { expect, test } from 'vitest';

import { getRev, pushRev } from '@app/lib/rev/ep.ts';

test('get episode rev', async () => {
  // const r = await getRev(15, 8);
  // expect(r).toMatchInlineSnapshot('Array []');
  await expect(pushRev(8, {
    ep_airdate: '1234-08-10',
    ep_desc: 'description',
    ep_duration: '20:10',
    ep_name: 'n',
    ep_name_cn: 'nnn',
    ep_sort: 0,
    ep_type: 0,
  }, 1, new Date())).resolves.toMatchInlineSnapshot('Array []');
});
