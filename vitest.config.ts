import 'dotenv/config';

import GithubActionsReporter from 'vitest-github-actions-reporter';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: { app: '.' },
    extensions: ['.js', '.ts'],
  },
  test: {
    reporters: process.env.GITHUB_ACTIONS ? ['default', new GithubActionsReporter()] : 'default',
    watch: false,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    threads: false,
    snapshotFormat: {
      printBasicPrototype: true,
    },
    coverage: {
      provider: 'c8',
      exclude: ['/node_modules/', 'lib/generated/'],
      reporter: ['lcov', 'text-summary', 'html-spa'],
    },
  },
});
