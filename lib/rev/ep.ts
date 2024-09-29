import type { EntityManager } from 'typeorm';

import type { EpTextRev, RevHistory } from '@app/lib/orm/entity/index.ts';
import { RevType } from '@app/lib/orm/entity/index.ts';
import * as entity from '@app/lib/orm/entity/index.ts';

export async function pushRev(
  t: EntityManager,
  {
    episodeID,
    rev,
    creator,
    now,
    comment,
  }: {
    episodeID: number;
    rev: EpTextRev;
    creator: number;
    now: Date;
    comment: string;
  },
) {
  const revs = await t.findBy(entity.RevHistory, {
    revMid: episodeID,
    revType: RevType.episodeEdit,
  });
  const o = revs.pop();
  if (!o) {
    return await createRevRecords({
      t: t,
      episodeID: episodeID,
      rev: rev,
      creator: creator,
      now: now,
      comment,
    });
  }

  return await updatePreviousRevRecords({
    t: t,
    previous: o,
    episodeID: episodeID,
    rev: rev,
    creator: creator,
    now: now,
    comment,
  });
}

async function updatePreviousRevRecords({
  t,
  previous,
  episodeID,
  rev,
  creator,
  now,
  comment,
}: {
  t: EntityManager;
  previous: RevHistory;
  episodeID: number;
  rev: EpTextRev;
  creator: number;
  now: Date;
  comment: string;
}) {
  const revText = await t.findOneOrFail(entity.RevText, {
    where: {
      revTextId: previous.revTextId,
    },
  });

  const revHistory = await t.save(entity.RevHistory, {
    revType: RevType.episodeEdit,
    revCreator: creator,
    revTextId: revText.revTextId,
    createdAt: now.getTime() / 1000,
    revMid: episodeID,
    revEditSummary: comment,
  });

  revText.revText = await entity.RevText.serialize({
    ...(await entity.RevText.deserialize(revText.revText)),
    [revHistory.revId]: rev,
  });
  await t.save(entity.RevText, revText);
}

async function createRevRecords({
  t,
  episodeID,
  rev,
  creator,
  now,
  comment,
}: {
  t: EntityManager;
  episodeID: number;
  rev: EpTextRev;
  creator: number;
  now: Date;
  comment: string;
}) {
  const revText = await t.save(entity.RevText, {
    revText: await entity.RevText.serialize({}),
  });

  const revHistory = await t.save(entity.RevHistory, {
    revType: RevType.episodeEdit,
    revCreator: creator,
    revTextId: revText.revTextId,
    createdAt: now.getTime() / 1000,
    revMid: episodeID,
    revEditSummary: comment,
  });

  revText.revText = await entity.RevText.serialize({ [revHistory.revId]: rev });
  await t.save(entity.RevText, revText);
}
