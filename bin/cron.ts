import { CronJob } from 'cron';

import { logger } from '@app/lib/logger';
import { heartbeat } from '@app/tasks/heartbeat';

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
  const jobs: CronJob<null, CronJobContext>[] = [
    newCronJob('heartbeat', '*/10 * * * * *', heartbeat),
    // Disabled in TS: trending cron has been migrated to Rust cron.
    // Use `cargo run -p bgm-backend -- cron trending-subjects-once`
    // and `cargo run -p bgm-backend -- cron trending-subject-topics-once`.
    // Disabled in TS: timeline truncate cron has been migrated to Rust cron.
    // Use `cargo run -p bgm-backend -- cron truncate-global-once`,
    // `cargo run -p bgm-backend -- cron truncate-inbox-once`,
    // and `cargo run -p bgm-backend -- cron truncate-user-once`.
    // Disabled in TS: oauth cleanup has been migrated to Rust cron.
    // Use `cargo run -p bgm-backend -- cron cleanup-expired-access-tokens-once`
    // and `cargo run -p bgm-backend -- cron cleanup-expired-refresh-tokens-once`.
  ];
  for (const job of jobs) {
    logger.info(`Cronjob: ${job.context.name} @ ${job.cronTime.source}`);
    job.start();
  }
}

main();
