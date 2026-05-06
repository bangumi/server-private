import * as console from 'node:console';
import * as process from 'node:process';

import { CronJob } from 'cron';

import { logger } from '@app/lib/logger';
import { heartbeat } from '@app/tasks/heartbeat';
import { cleanupExpiredAccessTokens, cleanupExpiredRefreshTokens } from '@app/tasks/oauth';
import {
  truncateGlobalCache as truncateTimelineGlobalCache,
  truncateInboxCache as truncateTimelineInboxCache,
  truncateUserCache as truncateTimelineUserCache,
} from '@app/tasks/timeline';
import { trendingSubjects, trendingSubjectTopics } from '@app/tasks/trending';

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

const jobsConfig: { name: string; cronTime: string; func: () => Promise<void> }[] = [
  { name: 'heartbeat', cronTime: '*/10 * * * * *', func: heartbeat },
  { name: 'trendingSubjects', cronTime: '0 0 3 * * *', func: trendingSubjects },
  { name: 'trendingSubjectTopics', cronTime: '0 */10 * * * *', func: trendingSubjectTopics },
  {
    name: 'truncateTimelineGlobalCache',
    cronTime: '*/10 * * * *',
    func: truncateTimelineGlobalCache,
  },
  { name: 'truncateTimelineInboxCache', cronTime: '0 0 4 * * *', func: truncateTimelineInboxCache },
  { name: 'truncateTimelineUserCache', cronTime: '0 0 5 * * *', func: truncateTimelineUserCache },
  { name: 'cleanupExpiredAccessTokens', cronTime: '0 0 6 * * *', func: cleanupExpiredAccessTokens },
  {
    name: 'cleanupExpiredRefreshTokens',
    cronTime: '0 0 7 * * *',
    func: cleanupExpiredRefreshTokens,
  },
];

function newCronJob(
  name: string,
  cronTime: string,
  func: () => Promise<void>,
): CronJob<null, CronJobContext> {
  const onTick = async () => {
    try {
      await func();
    } catch (error) {
      logger.child({ job: name }).error(error);
    }
  };
  return CronJob.from({
    context: {
      name,
    },
    cronTime,
    onTick,
    timeZone: 'Asia/Shanghai',
  });
}

function main() {
  const command = process.argv[2];

  if (command === 'run') {
    const jobName = process.argv[3];
    if (!jobName) {
      console.error('Usage: cron run <job-name>');
      console.error(`Available jobs: ${jobsConfig.map((j) => j.name).join(', ')}`);
      // eslint-disable-next-line unicorn/no-process-exit
      process.exit(1);
    }

    const config = jobsConfig.find((j) => j.name === jobName);
    if (!config) {
      console.error(`Unknown job: ${jobName}`);
      console.error(`Available jobs: ${jobsConfig.map((j) => j.name).join(', ')}`);
      // eslint-disable-next-line unicorn/no-process-exit
      process.exit(1);
    }

    logger.info(`Running job "${jobName}" manually...`);
    config
      .func()
      .then(() => {
        logger.info(`Job "${jobName}" completed.`);
        // eslint-disable-next-line unicorn/no-process-exit
        process.exit(0);
      })
      .catch((error: unknown) => {
        logger.error(error, `Job "${jobName}" failed.`);
        // eslint-disable-next-line unicorn/no-process-exit
        process.exit(1);
      });
    return;
  }

  if (command && command !== 'daemon') {
    console.error(`Unknown command: ${command}`);
    console.error('Usage: cron <daemon|run <job-name>>');
    // eslint-disable-next-line unicorn/no-process-exit
    process.exit(1);
  }

  const jobs: CronJob<null, CronJobContext>[] = jobsConfig.map((j) =>
    newCronJob(j.name, j.cronTime, j.func),
  );
  for (const job of jobs) {
    logger.info(`Cronjob: ${job.context.name} @ ${job.cronTime.source}`);
    job.start();
  }
}

main();
