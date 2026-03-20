import { db, op, schema, type Txn } from '@app/drizzle';
import type { EpTextRev, RevHistory } from '@app/lib/rev/type.ts';
import { RevType } from '@app/lib/rev/type.ts';
import { deserializeRevText, serializeRevText } from '@app/lib/rev/utils.ts';

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
    now: number;
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
  now: number;
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
    createdAt: now,
    revMid: episodeID,
    revEditSummary: comment,
  });

  revText.revText = await serializeRevText({
    ...(await deserializeRevText(revText.revText)),
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
  now: number;
  comment: string;
}) {
  const [{ insertId: revTextId }] = await t.insert(schema.chiiRevText).values({
    revText: await serializeRevText({}),
  });

  const [{ insertId: revId }] = await t.insert(schema.chiiRevHistory).values({
    revType: RevType.episodeEdit,
    revCreator: creator,
    revTextId: revTextId,
    createdAt: now,
    revMid: episodeID,
    revEditSummary: comment,
  });

  const revText = await serializeRevText({ [revId]: rev });
  await t
    .update(schema.chiiRevText)
    .set({
      revText: revText,
    })
    .where(op.eq(schema.chiiRevText.revTextId, revTextId));
}
