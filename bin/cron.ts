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

interface CronJobContext {
  name: string;
}

function newCronJob(
  name: string,
  cronTime: string,
  onTick: () => Promise<void>,
): CronJob<null, CronJobContext> {
  return CronJob.from({
    context: {
      name,
    },
    cronTime,
    onTick,
    timeZone: 'Asia/Shanghai',
    errorHandler: (error) => {
      logger.error(`Cronjob ${name} failed: ${error}`);
    },
  });
}

function main() {
  const jobs: CronJob<null, CronJobContext>[] = [
    newCronJob('heartbeat', '*/10 * * * * *', heartbeat),
    newCronJob('trendingSubjects', '0 0 3 * * *', trendingSubjects),
    newCronJob('truncateTimelineGlobalCache', '*/10 * * * *', truncateTimelineGlobalCache),
    newCronJob('truncateTimelineInboxCache', '0 0 4 * * *', truncateTimelineInboxCache),
    newCronJob('truncateTimelineUserCache', '0 0 5 * * *', truncateTimelineUserCache),
    newCronJob('cleanupExpiredAccessTokens', '0 0 6 * * *', cleanupExpiredAccessTokens),
    newCronJob('cleanupExpiredRefreshTokens', '0 0 7 * * *', cleanupExpiredRefreshTokens),
  ];
  for (const job of jobs) {
    logger.info(`Cronjob: ${job.context.name} @ ${job.cronTime.source}`);
    job.start();
  }
}

main();
