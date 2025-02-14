import { CronJob } from 'cron';

import { logger } from '@app/lib/logger';
import { heartbeat } from '@app/tasks/heartbeat';
import { cleanupExpiredAccessTokens, cleanupExpiredRefreshTokens } from '@app/tasks/oauth';
import {
  truncateGlobalCache as truncateTimelineGlobalCache,
  truncateInboxCache as truncateTimelineInboxCache,
  truncateUserCache as truncateTimelineUserCache,
} from '@app/tasks/timeline';
import { trendingSubjects } from '@app/tasks/trending';

// field          allowed values
// -----          --------------
// second         0-59
// minute         0-59
// hour           0-23
// day of month   1-31
// month          1-12 (or names, see below)
// day of week    0-7 (0 or 7 is Sunday, or use names)

// eslint-disable-next-line @typescript-eslint/require-await
async function main() {
  const jobs: Record<string, CronJob> = {
    heartbeat: new CronJob('*/10 * * * * *', heartbeat),
    trendingSubjects: new CronJob('0 0 19 * * *', trendingSubjects),
    truncateTimelineGlobalCache: new CronJob('*/10 * * * *', truncateTimelineGlobalCache),
    truncateTimelineInboxCache: new CronJob('0 0 20 * * *', truncateTimelineInboxCache),
    truncateTimelineUserCache: new CronJob('0 0 21 * * *', truncateTimelineUserCache),
    cleanupExpiredAccessTokens: new CronJob('0 0 22 * * *', cleanupExpiredAccessTokens),
    cleanupExpiredRefreshTokens: new CronJob('0 0 23 * * *', cleanupExpiredRefreshTokens),
  };

  for (const [name, job] of Object.entries(jobs)) {
    logger.info(`Cronjob: ${name} @ ${job.cronTime.source}`);
    job.start();
  }
}

await main();
