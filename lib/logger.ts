import * as process from 'node:process';

import { pino } from 'pino';

import { production, stage, testing, VERSION } from './config.ts';

export const logger = testing
  ? pino({ level: 'error' })
  : pino({
      level: 'info',
      base: production || stage ? { pid: process.pid, version: VERSION } : undefined,
      timestamp() {
        return `,"time":"${new Date().toISOString()}"`;
      },
      /** 使用 config.ts 的 production 变量会导致循环 import，所以直接从环境变量中读取 */
      transport:
        production || stage
          ? undefined
          : {
              target: 'pino-pretty',
              options: { colorize: true },
            },
      formatters: {
        level(level) {
          return { level };
        },
      },
    });
