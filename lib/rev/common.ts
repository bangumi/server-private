import { op, schema, type Txn } from '@app/drizzle';
import { serializeRevText } from '@app/lib/rev/utils.ts';

export async function createRevision(
  t: Txn,
  {
    mid,
    type,
    rev,
    creator,
    now = new Date(),
    comment,
  }: {
    mid: number;
    type: number;
    rev: unknown;
    creator: number;
    now?: Date;
    comment: string;
  },
) {
  const [{ insertId: revTextId }] = await t.insert(schema.chiiRevText).values({
    revText: await serializeRevText({}),
  });

  const [{ insertId: revId }] = await t.insert(schema.chiiRevHistory).values({
    revType: type,
    revCreator: creator,
    revTextId: revTextId,
    createdAt: now.getTime() / 1000,
    revMid: mid,
    revEditSummary: comment,
  });

  const revText = await serializeRevText({ [revId]: rev });
  await t
    .update(schema.chiiRevText)
    .set({ revText })
    .where(op.eq(schema.chiiRevText.revTextId, revTextId));
}
