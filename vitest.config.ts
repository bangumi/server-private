import 'dotenv/config';

import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';
import GithubActionsReporter from 'vitest-github-actions-reporter';

export default defineConfig({
  resolve: {
    extensions: ['.js', '.ts'],
  },
  plugins: [tsconfigPaths()],
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
      reporter: ['lcov', 'text-summary'],
    },
  },
});
