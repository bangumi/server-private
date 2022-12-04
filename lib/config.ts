import process from 'node:process';

import { logger } from './logger';

export const production = process.env.NODE_ENV === 'production';

if (production) {
  logger.info('running in production');
}
