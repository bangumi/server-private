import { CronJob } from 'cron';

import { heartbeat } from '@app/tasks/heartbeat';

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
  const jobs = [];
  jobs.push(new CronJob('*/10 * * * * *', heartbeat));

  for (const job of jobs) {
    job.start();
  }
}

await main();
