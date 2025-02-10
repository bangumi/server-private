import { DateTime } from 'luxon';

import type { Txn } from '@app/drizzle/db.ts';
import { op } from '@app/drizzle/db.ts';
import * as schema from '@app/drizzle/schema.ts';
import { dam } from '@app/lib/dam';
import type { SubjectType } from '@app/lib/subject/type.ts';

export enum TagCat {
  /** 条目, 对应的 type: 条目类型 */
  Subject = 0,

  /** 入口, 对应的 type: blog = 1 */
  Entry = 1,

  /** 同人, 对应的 type: dounin = 1 和 club = 2 */
  Doujin = 2,

  /** 条目 wiki, 对应的 type: 条目类型 */
  Meta = 3,
}

export function validateTags(tags: string[]): string[] {
  const result = new Set<string>();
  for (const tag of tags) {
    const t = tag.trim().normalize('NFKC');
    if (t.length < 2) {
      continue;
    }
    if (dam.needReview(t)) {
      continue;
    }
    result.add(t);
    if (result.size >= 10) {
      break;
    }
  }
  return [...result].sort();
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

  const tagIDs = await ensureTags(t, TagCat.Subject, stype, tags);
  const tids = Object.values(tagIDs).sort();

  if (tids.length > 0) {
    const now = DateTime.now().toUnixInteger();
    await t.insert(schema.chiiTagList).values(
      tids.map((id) => ({
        tagID: id,
        userID: uid,
        cat: TagCat.Subject,
        type: stype,
        mainID: sid,
        createdAt: now,
      })),
    );
    await updateTagResult(t, tids);
  }
  return tags;
}

export async function updateTagResult(t: Txn, tagIDs: number[]) {
  const now = DateTime.now().toUnixInteger();
  const counts = await t
    .select({
      tagID: schema.chiiTagList.tagID,
      count: op.count(schema.chiiTagList.tagID),
    })
    .from(schema.chiiTagList)
    .where(op.inArray(schema.chiiTagList.tagID, tagIDs))
    .groupBy(schema.chiiTagList.tagID);
  for (const item of counts) {
    await t
      .update(schema.chiiTagIndex)
      .set({
        count: item.count,
        updatedAt: now,
      })
      .where(op.eq(schema.chiiTagIndex.id, item.tagID))
      .limit(1);
  }
}

export async function ensureTags(
  t: Txn,
  cat: TagCat,
  type: number,
  tags: string[],
): Promise<Record<string, number>> {
  const tagIDs: Record<string, number> = {};
  if (tags.length === 0) {
    return tagIDs;
  }

  const existTags = await t
    .select()
    .from(schema.chiiTagIndex)
    .where(
      op.and(
        op.eq(schema.chiiTagIndex.cat, cat),
        op.eq(schema.chiiTagIndex.type, type),
        op.inArray(schema.chiiTagIndex.name, tags),
      ),
    );
  for (const tag of existTags) {
    tagIDs[tag.name] = tag.id;
  }

  const now = DateTime.now().toUnixInteger();
  const insertTags = tags.filter((tag) => !tagIDs[tag]);
  if (insertTags.length > 0) {
    const insertResult = await t
      .insert(schema.chiiTagIndex)
      .values(
        insertTags.map((tag) => ({
          name: tag,
          cat: cat,
          type: type,
          count: 0,
          createdAt: now,
          updatedAt: now,
        })),
      )
      .$returningId();
    for (const [idx, r] of insertResult.entries()) {
      const tag = insertTags[idx];
      if (tag) {
        tagIDs[tag] = r.id;
      }
    }
  }
  return tagIDs;
}
