const path = require('node:path');

const rulesDirPlugin = require('eslint-plugin-rulesdir');

rulesDirPlugin.RULES_DIR = path.join(__dirname, 'eslint');

module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'plugin:promise/recommended',
    'plugin:n/recommended',
    'plugin:unicorn/recommended',
    'prettier',
  ],
  plugins: ['import', 'unicorn', 'unused-imports', 'rulesdir', 'simple-import-sort'],
  ignorePatterns: ['**/dist/*', 'lib/generated/**/*', 'coverage/**/*'],
  env: {
    browser: false,
    node: true,
  },
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2022,
  },
  rules: {
    'space-before-function-paren': 'off',
  },
  settings: {
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts'],
    },
    'import/resolver': {
      typescript: {},
    },
  },
  overrides: [
    {
      files: ['**/*.ts'],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        project: './tsconfig.json',
      },
      extends: [
        'plugin:@typescript-eslint/recommended',
        'plugin:@typescript-eslint/recommended-requiring-type-checking',
        'plugin:@typescript-eslint/strict',
      ],
      plugins: ['@typescript-eslint', 'tsdoc'],
      rules: {
        'rulesdir/no-relative-parent-import': 'error',
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
        'unicorn/throw-new-error': 'error',
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
        '@typescript-eslint/restrict-plus-operands': ['error', { checkCompoundAssignments: true }],
        '@typescript-eslint/no-floating-promises': ['error', { ignoreVoid: true }],
        '@typescript-eslint/object-curly-spacing': ['error', 'always'],
        'import/consistent-type-specifier-style': ['error', 'prefer-top-level'],
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
        'simple-import-sort/imports': [
          'error',
          {
            groups: [
              // Side effect imports.
              ['^\\u0000'],
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
              ['^\\.'],
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
  ],
};
