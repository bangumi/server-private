import 'dotenv/config';

import * as url from 'node:url';

import { isCI } from 'std-env';
// eslint-disable-next-line import/extensions
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
