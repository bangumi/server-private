import { defineConfig } from 'drizzle-kit';

import config from './lib/config.ts';

export default defineConfig({
  // schema: "./src/schema/*",
  out: './drizzle',
  dialect: 'mysql',
  dbCredentials: {
    url: `mysql://${encodeURIComponent(config.mysql.user)}:${encodeURIComponent(config.mysql.password)}@${config.mysql.host}:${config.mysql.port}/${config.mysql.db}`,
  },
});
