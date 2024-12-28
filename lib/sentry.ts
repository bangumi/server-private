import * as Sentry from '@sentry/node';
import { DrizzleError } from 'drizzle-orm';
import type { FastifyError } from 'fastify';
import { TypeORMError } from 'typeorm';

import config from '@app/lib/config.ts';

if (config.sentryDSN) {
  Sentry.init({
    dsn: config.sentryDSN,
    includeLocalVariables: true,
    beforeSend(event, hint) {
      const error = hint.originalException as FastifyError;
      if (!error) {
        return null;
      }

      if (
        typeof error.statusCode !== 'number' ||
        error.statusCode === 500 ||
        error instanceof TypeORMError ||
        error instanceof DrizzleError
      ) {
        return event;
      }

      return null;
    },
  });
}
