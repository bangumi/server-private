import { Type as t } from '@sinclair/typebox';

import { NotAllowedError } from '@app/lib/auth';
import { BadRequestError, NotFoundError } from '@app/lib/error.ts';
import type { App } from '@app/routes/type.ts';
import { heartbeat } from '@app/tasks/heartbeat';
import { cleanupExpiredAccessTokens, cleanupExpiredRefreshTokens } from '@app/tasks/oauth';
import {
  truncateGlobalCache as truncateTimelineGlobalCache,
  truncateInboxCache as truncateTimelineInboxCache,
  truncateUserCache as truncateTimelineUserCache,
} from '@app/tasks/timeline';
import { trendingSubjects, trendingSubjectTopics } from '@app/tasks/trending';

// eslint-disable-next-line @typescript-eslint/require-await
export async function setup(app: App) {
  app.get(
    '/cron/:jobName/invoke',
    {
      schema: {
        hide: true,
        params: t.Object({
          jobName: t.String(),
        }),
      },
    },
    async ({ auth, params: { jobName } }, res) => {
      const jobMap: Record<string, () => Promise<void> | void> = {
        heartbeat,
        cleanupExpiredAccessTokens,
        cleanupExpiredRefreshTokens,
        truncateTimelineGlobalCache,
        truncateTimelineInboxCache,
        truncateTimelineUserCache,
        trendingSubjects,
        trendingSubjectTopics,
      };

      if (!auth.permission.cron_invoke) {
        throw new NotAllowedError('cron_invoke');
      }

      const job = jobMap[jobName];

      if (!job) {
        throw new NotFoundError(
          `Unknown job: ${jobName}, allowed jobs: [${Object.keys(jobMap).join(', ')}]`,
        );
      }

      try {
        await job();
        return res.send({ ok: true, job: jobName });
      } catch (error) {
        throw new BadRequestError(
          `Job failed: ${jobName}, detail: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    },
  );
}
