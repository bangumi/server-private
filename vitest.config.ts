import 'dotenv/config';

import * as url from 'node:url';

import { defineConfig } from 'vitest/config';
import GithubActionsReporter from 'vitest-github-actions-reporter';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@app': __dirname,
    },
    extensions: ['.js', '.ts'],
  },
  test: {
    reporters: process.env.GITHUB_ACTIONS ? ['default', new GithubActionsReporter()] : 'basic',
    watch: false,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    snapshotFormat: {
      printBasicPrototype: true,
    },
    singleThread: true,
    coverage: {
      provider: 'c8',
      reporter: ['lcov', 'text-summary'],
    },
  },
});
