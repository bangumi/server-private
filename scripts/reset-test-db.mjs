import 'dotenv/config';

import * as console from 'node:console';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as process from 'node:process';

import * as mysql from 'mysql2/promise';

const projectRoot = path.resolve(import.meta.dirname, '..');
const distSqlPath = path.join(projectRoot, 'upstream', 'dev-env', 'dist.sql');

async function main() {
  // dev-env submodule 未检出时跳过重置，不影响测试运行
  if (!fs.existsSync(distSqlPath)) {
    console.log('[reset-test-db] dev-env submodule 未检出，跳过数据库重置');
    return;
  }

  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST ?? '127.0.0.1',
    port: Number(process.env.MYSQL_PORT ?? 3306),
    user: process.env.MYSQL_USER ?? 'user',
    password: process.env.MYSQL_PASS ?? 'password',
    database: process.env.MYSQL_DB ?? 'bangumi',
    multipleStatements: true,
  });

  try {
    // dist.sql 会 drop 旧表并重建插入初始数据，可重复执行
    await connection.query(fs.readFileSync(distSqlPath, 'utf8'));
    console.log('[reset-test-db] 数据库已重置');
  } finally {
    await connection.end();
  }
}

await main();
