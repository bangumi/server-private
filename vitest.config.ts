/* eslint-disable import/no-unused-modules */
import 'dotenv/config';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    watch: false,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    threads: false,
    coverage: {
      provider: 'c8',
      exclude: ['/node_modules/', 'lib/generated/'],
      reporter: ['lcov', 'text-summary', 'html-spa'],
    },
  },
});
