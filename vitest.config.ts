import 'dotenv/config';

import { isCI } from 'std-env';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@app': import.meta.dirname,
    },
    extensions: ['.js', '.ts'],
  },
  test: {
    reporters: isCI
      ? [['default' as const, { summary: false }], 'github-actions']
      : [['default' as const, { summary: false }]],
    watch: false,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    snapshotFormat: {
      printBasicPrototype: true,
    },
    ui: false,
    isolate: false,
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      reporter: ['lcov', 'text-summary'],
    },
  },
});
