import { CronJob } from 'cron';

import { logger } from '@app/lib/logger';
import { heartbeat } from '@app/tasks/heartbeat';
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
  };

  for (const [name, job] of Object.entries(jobs)) {
    logger.info(`Cronjob: ${name} @ ${job.cronTime.source}`);
    job.start();
  }
}

await main();
