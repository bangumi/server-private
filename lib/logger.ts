import { pino } from 'pino';

import { production } from './config';

export const logger = pino({
  level: 'info',
  base: { pid: process.pid },
  timestamp() {
    return `,"time":"${new Date().toISOString()}"`;
  },
  transport: production
    ? undefined
    : {
        target: 'pino-pretty',
        options: {
          colorize: true,
        },
      },
  formatters: {
    level(level) {
      return { level };
    },
  },
});
