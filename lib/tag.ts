import * as lo from 'lodash-es';
import { DateTime } from 'luxon';

import type { Txn } from '@app/drizzle/db.ts';
import { op } from '@app/drizzle/db.ts';
import * as schema from '@app/drizzle/schema.ts';
import { dam } from '@app/lib/dam';
import type { SubjectType } from '@app/lib/subject/type.ts';
import { TagCat } from '@app/lib/subject/type.ts';

export function validateTags(tags: string[]): string[] {
  let count = 0;
  const result: string[] = [];
  for (const tag of tags) {
    const t = tag.trim().normalize('NFKC');
    if (t.length < 2) {
      continue;
    }
    if (dam.needReview(t)) {
      continue;
    }
    result.push(t);
    count++;
    if (count >= 10) {
      break;
    }
  }
  return lo.uniq(result).sort();
}

/**
 * 插入用户收藏标签，需要在事务中执行
 *
 * @param t - 事务
 * @param uid - 用户ID
 * @param sid - 条目ID
 * @param stype - 条目类型
 * @param tags - 输入的标签
 * @returns 清理后的标签
 */
export async function insertUserSubjectTags(
  t: Txn,
  uid: number,
  sid: number,
  stype: SubjectType,
  tags: string[],
): Promise<string[]> {
  const now = DateTime.now().toUnixInteger();
  tags = validateTags(tags);
  await t
    .delete(schema.chiiTagList)
    .where(
      op.and(
        op.eq(schema.chiiTagList.userID, uid),
        op.eq(schema.chiiTagList.cat, TagCat.Subject),
        op.eq(schema.chiiTagList.type, stype),
        op.eq(schema.chiiTagList.mainID, sid),
      ),
    );
  const tagIDs: number[] = [];
  const tagMap = new Map<string, number>();

  if (tags.length > 0) {
    const existTags = await t
      .select()
      .from(schema.chiiTagIndex)
      .where(
        op.and(
          op.eq(schema.chiiTagIndex.cat, TagCat.Subject),
          op.eq(schema.chiiTagIndex.type, stype),
          op.inArray(schema.chiiTagIndex.name, tags),
        ),
      );
    for (const tag of existTags) {
      tagMap.set(tag.name, tag.id);
      tagIDs.push(tag.id);
    }
  }

  const insertTags = tags.filter((tag) => !tagMap.has(tag));
  if (insertTags.length > 0) {
    const insertResult = await t
      .insert(schema.chiiTagIndex)
      .values(
        insertTags.map((tag) => ({
          name: tag,
          cat: TagCat.Subject,
          type: stype,
          count: 0,
          createdAt: now,
          updatedAt: now,
        })),
      )
      .$returningId();
    tagIDs.push(...insertResult.map((r) => r.id));
  }

  await t.insert(schema.chiiTagList).values(
    tagIDs.map((id) => ({
      tagID: id,
      userID: uid,
      cat: TagCat.Subject,
      type: stype,
      mainID: sid,
      createdAt: now,
    })),
  );
  const counts = await t
    .select({
      tagID: schema.chiiTagList.tagID,
      count: op.count(schema.chiiTagList.tagID),
    })
    .from(schema.chiiTagList)
    .where(op.inArray(schema.chiiTagList.tagID, tagIDs))
    .groupBy(schema.chiiTagList.tagID);
  for (const count of counts) {
    await t
      .update(schema.chiiTagIndex)
      .set({
        count: count.count,
      })
      .where(op.eq(schema.chiiTagIndex.id, count.tagID))
      .limit(1);
  }
  return tags;
}
