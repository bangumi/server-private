import { db, op, schema } from '@app/drizzle';
import { logger } from '@app/lib/logger';
import { resolveSubjectDate } from '@app/lib/subject/date.ts';
import { sleep } from '@app/lib/utils';

const BATCH_SIZE = 1000;
const BATCH_DELAY = 200;
const LOG_EVERY_BATCHES = 100;
const MAX_SUBJECT_ID = 8_388_607; // mediumint 上界

interface RefreshOptions {
  startID?: number;
  endID?: number;
}

/**
 * 全量重算条目日期，用于修复 CDC 漏消息导致的过期数据。
 *
 * 与 CDC 路径语义保持一致：infobox 解析不出日期时保持原值，不清空。
 */
export async function refreshSubjectDates({
  startID = 0,
  endID = MAX_SUBJECT_ID,
}: RefreshOptions = {}) {
  let cursor = startID;
  let scanned = 0;
  let updated = 0;
  let batches = 0;

  for (;;) {
    const rows = await db
      .select({
        id: schema.chiiSubjects.id,
        typeID: schema.chiiSubjects.typeID,
        platform: schema.chiiSubjects.platform,
        infobox: schema.chiiSubjects.infobox,
        year: schema.chiiSubjectFields.year,
        month: schema.chiiSubjectFields.month,
        date: schema.chiiSubjectFields.date,
      })
      .from(schema.chiiSubjects)
      .innerJoin(
        schema.chiiSubjectFields,
        op.eq(schema.chiiSubjectFields.id, schema.chiiSubjects.id),
      )
      .where(
        op.and(
          op.eq(schema.chiiSubjects.ban, 0),
          op.gt(schema.chiiSubjects.id, cursor),
          op.lte(schema.chiiSubjects.id, endID),
        ),
      )
      .orderBy(schema.chiiSubjects.id)
      .limit(BATCH_SIZE);

    const last = rows.at(-1);
    if (!last) {
      break;
    }

    cursor = last.id;
    scanned += rows.length;
    batches += 1;

    for (const row of rows) {
      const date = resolveSubjectDate(row.infobox, row.typeID, row.platform);
      if (!date) {
        continue;
      }

      const dateString = date.toString();
      if (row.year === date.year && row.month === date.month && row.date === dateString) {
        continue;
      }

      await db
        .update(schema.chiiSubjectFields)
        .set({
          year: date.year,
          month: date.month,
          date: dateString,
        })
        .where(op.eq(schema.chiiSubjectFields.id, row.id));
      updated += 1;
    }

    if (batches % LOG_EVERY_BATCHES === 0) {
      logger.info(`refresh subject dates: ${scanned} scanned, ${updated} updated`);
    }

    if (rows.length < BATCH_SIZE) {
      break;
    }

    await sleep(BATCH_DELAY);
  }

  logger.info(`refresh subject dates done: ${scanned} scanned, ${updated} updated`);
}
