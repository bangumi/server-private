import * as process from 'node:process';

import { requestContext } from '@fastify/request-context';
import { pino } from 'pino';

import { production, stage, testing, VERSION } from './config.ts';

function requestMixin() {
  const req = requestContext.get('req');
  if (req) {
    return { request: req };
  }
  return {};
}

function createLogger() {
  if (testing) {
    return pino({ level: 'error' });
  }

  if (production || stage) {
    return pino({
      level: 'info',
      base: production || stage ? { pid: process.pid, version: VERSION } : undefined,
      timestamp() {
        return `,"time":"${new Date().toISOString()}"`;
      },
      mixin: requestMixin,
      formatters: {
        level(level) {
          return { level };
        },
      },
    });
  }

  return pino({
    level: 'trace',
    transport: {
      target: 'pino-pretty',
      options: { colorize: true },
    },
    mixin: requestMixin,
    formatters: {
      level(level) {
        return { level };
      },
    },
  });
}

export const logger = createLogger();
