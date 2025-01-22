import type { Txn } from '@app/drizzle/db.ts';
import { db, op } from '@app/drizzle/db.ts';
import * as schema from '@app/drizzle/schema.ts';
import type { EpTextRev, RevHistory } from '@app/lib/orm/entity/index.ts';
import { RevType } from '@app/lib/orm/entity/index.ts';
import * as entity from '@app/lib/orm/entity/index.ts';

export async function pushRev(
  t: Txn,
  {
    revisions,
    creator,
    now,
    comment,
  }: {
    revisions: { episodeID: number; rev: EpTextRev }[];
    creator: number;
    now: Date;
    comment: string;
  },
) {
  const revs = await db
    .select()
    .from(schema.chiiRevHistory)
    .where(
      op.and(
        op.inArray(
          schema.chiiRevHistory.revMid,
          revisions.map((r) => r.episodeID),
        ),
        op.eq(schema.chiiRevHistory.revType, RevType.episodeEdit),
      ),
    );
  const revMap = new Map<number, (typeof revs)[number]>(revs.map((r) => [r.revMid, r]));

  for (const { episodeID, rev } of revisions) {
    const o = revMap.get(episodeID);
    if (o) {
      await updatePreviousRevRecords({
        t: t,
        previous: o,
        episodeID: episodeID,
        rev: rev,
        creator: creator,
        now: now,
        comment,
      });
    } else {
      await createRevRecords({
        t: t,
        episodeID: episodeID,
        rev: rev,
        creator: creator,
        now: now,
        comment,
      });
    }
  }
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
  t: Txn;
  previous: RevHistory;
  episodeID: number;
  rev: EpTextRev;
  creator: number;
  now: Date;
  comment: string;
}) {
  const [revText] = await t
    .select()
    .from(schema.chiiRevText)
    .where(op.eq(schema.chiiRevText.revTextId, previous.revTextId));

  if (!revText) {
    throw new Error(`RevText not found for ID: ${previous.revTextId}`);
  }

  const [{ insertId: revId }] = await t.insert(schema.chiiRevHistory).values({
    revType: RevType.episodeEdit,
    revCreator: creator,
    revTextId: revText.revTextId,
    createdAt: now.getTime() / 1000,
    revMid: episodeID,
    revEditSummary: comment,
  });

  revText.revText = await entity.RevText.serialize({
    ...(await entity.RevText.deserialize(revText.revText)),
    [revId]: rev,
  });
  await t
    .update(schema.chiiRevText)
    .set({
      revText: revText.revText,
    })
    .where(op.eq(schema.chiiRevText.revTextId, revText.revTextId));
}

async function createRevRecords({
  t,
  episodeID,
  rev,
  creator,
  now,
  comment,
}: {
  t: Txn;
  episodeID: number;
  rev: EpTextRev;
  creator: number;
  now: Date;
  comment: string;
}) {
  const [{ insertId: revTextId }] = await t.insert(schema.chiiRevText).values({
    revText: await entity.RevText.serialize({}),
  });

  const [{ insertId: revId }] = await t.insert(schema.chiiRevHistory).values({
    revType: RevType.episodeEdit,
    revCreator: creator,
    revTextId: revTextId,
    createdAt: now.getTime() / 1000,
    revMid: episodeID,
    revEditSummary: comment,
  });

  const revText = await entity.RevText.serialize({ [revId]: rev });
  await t
    .update(schema.chiiRevText)
    .set({
      revText: revText,
    })
    .where(op.eq(schema.chiiRevText.revTextId, revTextId));
}
