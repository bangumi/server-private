import eslint from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import erasableSyntaxOnly from 'eslint-plugin-erasable-syntax-only';
import pluginPromise from 'eslint-plugin-promise';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import eslintPluginTsDoc from 'eslint-plugin-tsdoc';
import eslintPluginUnicorn from 'eslint-plugin-unicorn';
import unusedImports from 'eslint-plugin-unused-imports';
import tsEslint from 'typescript-eslint';

import firstPartEslintPlugin from './eslint/index.mjs';

const sortImport = {
  'simple-import-sort/imports': [
    'error',
    {
      groups: [
        [String.raw`^\u0000`], // Side effect imports.
        ['^node:'],
        ['^'],
        ['^@app/.*'],
        [String.raw`^\.`], // Relative imports.
      ],
    },
  ],
};

export default tsEslint.config(
  {
    ignores: [
      'vendor/proto/**',
      'dist/**',
      'coverage/**',
      '**/__generated__/**',
      '**/generated/**',
      'drizzle/new/**/*',
    ],
  },
  eslint.configs.recommended,
  pluginPromise.configs['flat/recommended'],
  ...tsEslint.configs.recommendedTypeChecked,
  ...tsEslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          defaultProject: 'tsconfig.json',
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  eslintPluginUnicorn.configs.recommended,
  {
    rules: {
      'unicorn/import-style': 'off',
      'unicorn/no-array-reduce': 'off',
      'unicorn/no-null': 'off',
      'unicorn/numeric-separators-style': 'off',
      'unicorn/prevent-abbreviations': 'off',
      'unicorn/better-regex': 'error',
      'unicorn/prefer-ternary': 'off',
      'unicorn/no-instanceof-array': 'error',
      'unicorn/no-new-array': 'error',
      'unicorn/no-new-buffer': 'error',
      'unicorn/no-unnecessary-await': 'error',
      'unicorn/throw-new-error': 'error',
      'unicorn/no-useless-promise-resolve-reject': 'error',
      'unicorn/prefer-string-starts-ends-with': 'error',
      'unicorn/prefer-string-slice': 'error',
      'unicorn/prefer-regexp-test': 'error',
      'unicorn/prefer-module': 'error',
      'unicorn/prefer-modern-math-apis': 'error',
      'unicorn/prefer-includes': 'error',
    },
  },
  {
    plugins: {
      tsdoc: eslintPluginTsDoc,
      'simple-import-sort': simpleImportSort,
      'first-part': firstPartEslintPlugin,
      'unused-imports': unusedImports,
    },
  },
  {
    rules: {
      '@typescript-eslint/restrict-template-expressions': 'off',
      'unicorn/import-style': 'off',
      'first-part/no-relative-parent-import': 'error',
      'unused-imports/no-unused-imports': 'error',
      curly: ['error'],
      'tsdoc/syntax': 'error',
      'no-new-object': 'error',
      'no-console': 'error',
      'no-new-wrappers': 'error',
      'unicorn/no-null': 'off',
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
      'require-await': 'off',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/require-await': 'error',
      '@typescript-eslint/no-unsafe-enum-comparison': 'off',
      '@typescript-eslint/restrict-plus-operands': ['error', { skipCompoundAssignments: false }],
      '@typescript-eslint/no-floating-promises': ['error', { ignoreVoid: true }],
      '@typescript-eslint/object-curly-spacing': ['error', 'always'], // 'import/consistent-type-specifier-style': ['error', 'prefer-top-level'],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'separate-type-imports',
        },
      ],
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      '@typescript-eslint/no-deprecated': 'error',
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
      ...sortImport,
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

      'simple-import-sort/exports': 'error',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'after-used',
          varsIgnorePattern: '_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/strict-boolean-expressions': 'off',
    },
  },
  {
    files: ['tests/**/*', '**/*.test.ts'],
    rules: {
      '@typescript-eslint/consistent-type-imports': ['error', { disallowTypeAnnotations: false }],
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      ...sortImport,
    },
  },
  {
    files: ['**/*.cjs', '**/*.js', '**/*.mjs'],
    rules: {
      '@typescript-eslint/consistent-type-imports': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    files: ['scripts/*.js', 'scripts/*.mjs'],
    rules: {
      'no-console': 'off',
    },
  },
  eslintConfigPrettier,
  erasableSyntaxOnly.configs.recommended,
);
