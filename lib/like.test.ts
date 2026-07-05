import { afterEach, beforeEach, expect, test } from 'vitest';

import { db, op, schema } from '@app/drizzle';
import { LikeType, Reaction } from '@app/lib/like.ts';

const testReaction = {
  type: LikeType.GroupReply,
  mid: 987001,
  rid: 987002,
  uid: 987003,
  value: 54,
};

async function deleteTestReaction() {
  await db
    .delete(schema.chiiLikes)
    .where(
      op.and(
        op.eq(schema.chiiLikes.type, testReaction.type),
        op.eq(schema.chiiLikes.relatedID, testReaction.rid),
        op.eq(schema.chiiLikes.uid, testReaction.uid),
      ),
    );
}

beforeEach(deleteTestReaction);
afterEach(deleteTestReaction);

test('group topic reactions', async () => {
  await expect(Reaction.fetchByMainID(379821, LikeType.GroupReply)).resolves.toMatchSnapshot();
});

test('delete reaction', async () => {
  await Reaction.add(testReaction);
  await Reaction.delete({
    type: testReaction.type,
    rid: testReaction.rid,
    uid: testReaction.uid,
  });

  const [reaction] = await db
    .select()
    .from(schema.chiiLikes)
    .where(
      op.and(
        op.eq(schema.chiiLikes.type, testReaction.type),
        op.eq(schema.chiiLikes.relatedID, testReaction.rid),
        op.eq(schema.chiiLikes.uid, testReaction.uid),
      ),
    )
    .limit(1);

  expect(reaction?.deleted).toBe(true);
});
