import * as Sentry from '@sentry/node';

import config from '@app/lib/config.ts';

if (config.sentryDSN) {
  Sentry.init({
    dsn: config.sentryDSN,
  });
}
