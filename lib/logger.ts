import process from 'node:process';

import { pino } from 'pino';

import { production, VERSION } from './config';

export const logger = pino({
  level: 'info',
  base: production ? { pid: process.pid, version: VERSION } : undefined,
  timestamp() {
    return `,"time":"${new Date().toISOString()}"`;
  },
  /** 使用 config.ts 的 production 变量会导致循环 import，所以直接从环境变量中读取 */
  transport: production ? undefined : { target: 'pino-pretty', options: { colorize: true } },
  formatters: {
    level(level) {
      return { level };
    },
  },
});
