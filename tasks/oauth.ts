import { DateTime } from 'luxon';

import { db, op, schema } from '@app/drizzle';
import { logger } from '@app/lib/logger';
import { sleep } from '@app/lib/utils';

const CLEANUP_BATCH_LIMIT = 1000;

export async function cleanupExpiredAccessTokens() {
  const notAfter = DateTime.now().minus({ days: 7 }).toJSDate();
  while (true) {
    const [deleted] = await db
      .delete(schema.chiiAccessToken)
      .where(op.lt(schema.chiiAccessToken.expiredAt, notAfter))
      .limit(CLEANUP_BATCH_LIMIT);
    if (deleted.affectedRows === 0) {
      logger.info('No more expired access tokens to delete');
      break;
    }
    logger.info(`Deleted ${deleted.affectedRows} expired access tokens`);
    await sleep(1000);
  }
}

export async function cleanupExpiredRefreshTokens() {
  const notAfter = DateTime.now().minus({ days: 7 }).toJSDate();
  while (true) {
    const [deleted] = await db
      .delete(schema.chiiOAuthRefreshToken)
      .where(op.lt(schema.chiiOAuthRefreshToken.expiredAt, notAfter))
      .limit(CLEANUP_BATCH_LIMIT);
    if (deleted.affectedRows === 0) {
      logger.info('No more expired refresh tokens to delete');
      break;
    }
    logger.info(`Deleted ${deleted.affectedRows} expired refresh tokens`);
    await sleep(1000);
  }
}
