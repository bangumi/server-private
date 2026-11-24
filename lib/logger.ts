import * as process from 'node:process';

import { requestContext } from '@fastify/request-context';
import { pino } from 'pino';

import config, { production, stage, testing, VERSION } from './config.ts';

const level = config.logLevel ?? (testing ? 'error' : production || stage ? 'info' : 'trace');

function requestMixin() {
  const ctx: Record<string, unknown> = {};
  const req = requestContext.get('req');
  if (req) {
    ctx.request = req;
  }

  const user = requestContext.get('user');
  if (user) {
    ctx.userID = user;
  }

  return ctx;
}

function createLogger() {
  if (testing) {
    return pino({ level });
  }

  if (production || stage) {
    return pino({
      level,
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
    level,
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
