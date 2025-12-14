import { type AnyColumn, type ExtractTablesWithRelations, sql } from 'drizzle-orm';
import type { MySqlTransaction } from 'drizzle-orm/mysql-core';
import {
  drizzle,
  type MySql2PreparedQueryHKT,
  type MySql2QueryResultHKT,
} from 'drizzle-orm/mysql2';
import * as mysql from 'mysql2/promise';

import config, { developing, testing } from '@app/lib/config.ts';
import { logger } from '@app/lib/logger.ts';

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
            logger.trace({ query, params }, 'query');
          },
        }
      : undefined,
});

export const incr = (column: AnyColumn, value = 1) => {
  return sql`${column} + ${value}`;
};

export const decr = (column: AnyColumn, value = 1) => {
  return sql`${column} - ${value}`;
};

export type Txn = MySqlTransaction<
  MySql2QueryResultHKT,
  MySql2PreparedQueryHKT,
  typeof schema,
  ExtractTablesWithRelations<Record<string, unknown>>
>;
