import 'dotenv/config';

import { isCI } from 'std-env';
import { defineConfig } from 'vitest/config';
import GithubActionsReporter from 'vitest-github-actions-reporter';

export default defineConfig({
  resolve: {
    alias: {
      '@app': import.meta.dirname,
    },
    extensions: ['.js', '.ts'],
  },
  test: {
    reporters: isCI ? ['default', new GithubActionsReporter()] : 'basic',
    watch: false,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    snapshotFormat: {
      printBasicPrototype: true,
    },
    poolOptions: {
      singleThread: true,
    },
    coverage: {
      provider: 'v8',
      reporter: ['lcov', 'text-summary'],
    },
  },
});
