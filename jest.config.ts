import type { Config } from 'jest';

// eslint-disable-next-line import/no-unused-modules
export default {
  // preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  coveragePathIgnorePatterns: ['/node_modules/'],
  coverageProvider: 'v8',
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '\\.[jt]s$': 'babel-jest',
  },
} satisfies Config;
