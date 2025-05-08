import { DateTime } from 'luxon';
import { expect, test } from 'vitest';

import { db, op, schema } from '@app/drizzle';
import { RevType } from '@app/lib/orm/entity/index.ts';

import { pushRev } from './ep.ts';

test('get episode rev', async () => {
  // const r = await getRev(15, 8);
  // expect(r).toMatchInlineSnapshot('Array []');

  await db
    .delete(schema.chiiRevHistory)
    .where(
      op.and(
        op.eq(schema.chiiRevHistory.revMid, 8),
        op.eq(schema.chiiRevHistory.revType, RevType.episodeEdit),
      ),
    );

  await db.transaction(async (t) => {
    await expect(
      pushRev(t, {
        revisions: [
          {
            episodeID: 8,
            rev: {
              ep_airdate: '1234-08-10',
              ep_desc: 'description',
              ep_duration: '20:10',
              ep_name: 'n',
              ep_name_cn: 'nnn',
              ep_sort: '0',
              ep_disc: '0',
              ep_type: '0',
            },
          },
        ],
        creator: 1,
        now: DateTime.now().toUnixInteger(),
        comment: 'test',
      }),
    ).resolves.toMatchInlineSnapshot('undefined');

    const revs = await t
      .select()
      .from(schema.chiiRevHistory)
      .where(
        op.and(
          op.eq(schema.chiiRevHistory.revMid, 8),
          op.eq(schema.chiiRevHistory.revType, RevType.episodeEdit),
        ),
      );
    expect(revs).toHaveLength(1);
    expect(revs[0]).toMatchObject({
      revMid: 8,
      revType: RevType.episodeEdit,
      revCreator: 1,
      revEditSummary: 'test',
    });
  });
});
