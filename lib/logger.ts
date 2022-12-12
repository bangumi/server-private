import process from 'node:process';

import { pino } from 'pino';

export const logger = pino({
  level: 'info',
  base: { pid: process.pid },
  timestamp() {
    return `,"time":"${new Date().toISOString()}"`;
  },
  /** 使用 config.ts 的 production 变量会导致循环 import，所以直接从环境变量中读取 */
  transport:
    process.env.NODE_ENV === 'production'
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
