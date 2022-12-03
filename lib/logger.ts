import { pino } from 'pino';

export const logger = pino({
  level: 'info',
  base: { pid: process.pid },
  timestamp() {
    return `,"time":"${new Date().toISOString()}"`;
  },
  formatters: {
    level(level) {
      return { level };
    },
  },
});
