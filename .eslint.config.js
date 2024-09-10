import path from 'node:path';
import js from '@eslint/js';

import { createRequire } from 'node:module';

import tsParser from '@typescript-eslint/parser';

const require = createRequire(import.meta.url);

const firstPartEslintPlugin = require('./eslint/index.cjs');

export default [
  js.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    // extends: [
    //   'plugin:@typescript-eslint/recommended',
    //   'plugin:@typescript-eslint/recommended-requiring-type-checking',
    //   'plugin:@typescript-eslint/strict',
    // ],
    plugins: {
      '@typescript-eslint': {},
      tsdoc: {},
      'first-part': firstPartEslintPlugin,
      import: {},
      unicorn: {},
      'unused-imports': {},
      'simple-import-sort': {},
    },
    rules: {
      'unicorn/import-style': 'off',
      'first-part/no-relative-parent-import': 'error',
      'unused-imports/no-unused-imports': 'error',
      curly: ['error'],
      'tsdoc/syntax': 'error',
      'no-new-object': 'error',
      'no-console': 'error',
      'no-new-wrappers': 'error',
      'unicorn/no-null': 'off',
      'unicorn/no-unsafe-regex': 'error',
      'unicorn/numeric-separators-style': 'off',
      'unicorn/prevent-abbreviations': 'off',
      'unicorn/better-regex': 'error',
      'unicorn/prefer-ternary': 'off',
      'unicorn/no-instanceof-array': 'error',
      'unicorn/no-new-array': 'error',
      'unicorn/no-new-buffer': 'error',
      'unicorn/no-unnecessary-await': 'error',
      'unicorn/throw-new-error': 'off',
      'unicorn/no-useless-promise-resolve-reject': 'error',
      'unicorn/prefer-string-starts-ends-with': 'error',
      'unicorn/prefer-string-slice': 'error',
      'unicorn/prefer-regexp-test': 'error',
      'unicorn/prefer-module': 'error',
      'unicorn/prefer-modern-math-apis': 'error',
      'unicorn/prefer-includes': 'error',
      quotes: 'off',
      '@typescript-eslint/quotes': 'off',
      'n/no-missing-import': 'off',
      'linebreak-style': ['error', 'unix'],
      indent: 'off',
      'array-element-newline': ['error', 'consistent'],
      'array-bracket-newline': ['error', 'consistent'],
      'promise/catch-or-return': ['error', { allowFinally: true }],
      '@typescript-eslint/restrict-plus-operands': ['error', { skipCompoundAssignments: false }],
      '@typescript-eslint/no-floating-promises': ['error', { ignoreVoid: true }],
      '@typescript-eslint/object-curly-spacing': ['error', 'always'],
      'import/consistent-type-specifier-style': ['error', 'prefer-top-level'],
      '@typescript-eslint/no-unsafe-enum-comparison': 'off',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'separate-type-imports',
        },
      ],
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      '@typescript-eslint/member-delimiter-style': [
        'error',
        {
          multiline: {
            delimiter: 'semi',
            requireLast: true,
          },
          singleline: {
            delimiter: 'semi',
            requireLast: false,
          },
          multilineDetection: 'brackets',
        },
      ],
      '@typescript-eslint/space-before-function-paren': 'off',
      '@typescript-eslint/semi': ['error', 'always'],
      semi: ['error', 'always'],
      'comma-dangle': [
        'error',
        {
          arrays: 'always-multiline',
          objects: 'always-multiline',
          imports: 'always-multiline',
          exports: 'always-multiline',
          functions: 'ignore',
        },
      ],
      'import/first': 'error',
      'import/no-duplicates': 'error',
      'import/newline-after-import': 'error',
      'import/no-named-as-default': 'off',
      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            // Side effect imports.
            [String.raw`^\u0000`],
            // Node.js builtins prefixed with `node:`.
            ['^node:'],
            // Absolute imports and other imports such as Vue-style `@/foo`.
            // Anything not matched in another group.
            ['^'],
            // Packages.
            // Things that start with a letter (or digit or underscore), or `@` followed by a letter.
            ['^@app/.*'],
            // Relative imports.
            // Anything that starts with a dot.
            [String.raw`^\.`],
          ],
        },
      ],
      'simple-import-sort/exports': 'error',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { args: 'after-used', varsIgnorePattern: '_', destructuredArrayIgnorePattern: '^_' },
      ],
      '@typescript-eslint/strict-boolean-expressions': 'off',
    },
  },
  {
    files: ['tests/**/*', '*.test.ts'],
    rules: {
      '@typescript-eslint/consistent-type-imports': ['error', { disallowTypeAnnotations: false }],
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    files: ['**/*.cjs'],
    rules: {
      '@typescript-eslint/consistent-type-imports': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
];
