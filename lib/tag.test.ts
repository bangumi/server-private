import { afterEach, describe, expect, test } from 'vitest';

import { db, op, schema } from '@app/drizzle';
import { insertUserTags, TagCat } from '@app/lib/tag.ts';

const uid = 287_622;
const mid = 12;
const type = 2;
const tagA = 'tagtest-aaa';
const tagB = 'tagtest-bbb';
const tagC = 'tagtest-ccc';
const tagNames = [tagA, tagB, tagC];

async function getTagCount(name: string): Promise<number | null> {
  const [row] = await db
    .select({ count: schema.chiiTagIndex.count })
    .from(schema.chiiTagIndex)
    .where(
      op.and(
        op.eq(schema.chiiTagIndex.name, name),
        op.eq(schema.chiiTagIndex.cat, TagCat.Subject),
        op.eq(schema.chiiTagIndex.type, type),
      ),
    );
  return row?.count ?? null;
}

describe('insertUserTags count maintenance', () => {
  afterEach(async () => {
    await db
      .delete(schema.chiiTagList)
      .where(
        op.and(
          op.eq(schema.chiiTagList.userID, uid),
          op.eq(schema.chiiTagList.cat, TagCat.Subject),
          op.eq(schema.chiiTagList.type, type),
          op.eq(schema.chiiTagList.mainID, mid),
        ),
      );
    await db
      .delete(schema.chiiTagIndex)
      .where(
        op.and(
          op.eq(schema.chiiTagIndex.cat, TagCat.Subject),
          op.eq(schema.chiiTagIndex.type, type),
          op.inArray(schema.chiiTagIndex.name, tagNames),
        ),
      );
  });

  test('should recount tag results after replacing and clearing tags', async () => {
    await db.transaction(async (t) => {
      await insertUserTags(t, uid, TagCat.Subject, type, mid, [tagA, tagB]);
    });
    expect(await getTagCount(tagA)).toBe(1);
    expect(await getTagCount(tagB)).toBe(1);

    // 替换：移除 A，新增 C，被移除的 A 计数应归零
    await db.transaction(async (t) => {
      await insertUserTags(t, uid, TagCat.Subject, type, mid, [tagB, tagC]);
    });
    expect(await getTagCount(tagA)).toBe(0);
    expect(await getTagCount(tagB)).toBe(1);
    expect(await getTagCount(tagC)).toBe(1);

    // 清空：全部移除后计数应归零
    await db.transaction(async (t) => {
      await insertUserTags(t, uid, TagCat.Subject, type, mid, []);
    });
    expect(await getTagCount(tagB)).toBe(0);
    expect(await getTagCount(tagC)).toBe(0);
  });
});
