import { drizzle } from 'drizzle-orm/mysql2';
import * as mysql from 'mysql2/promise';

import config, { developing, testing } from '@app/lib/config.ts';

import * as schema from './schema.ts';

const poolConnection = mysql.createPool({
  host: config.mysql.host,
  user: config.mysql.user,
  database: config.mysql.db,
  password: config.mysql.password,
  port: config.mysql.port,
});

export const db = drizzle(poolConnection, {
  schema,
  mode: 'default',
  logger:
    testing || developing
      ? {
          logQuery(query: string, params: unknown[]) {
            // eslint-disable-next-line no-console
            console.log('query:', query, params);
          },
        }
      : undefined,
});

export * as schema from './schema.ts';
export * as op from 'drizzle-orm';
