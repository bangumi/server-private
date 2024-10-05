// TODO: remove this after https://github.com/import-js/eslint-plugin-import/issues/2467 is fixed

import * as path from 'node:path';
import * as posix from 'node:path/posix';
import { fileURLToPath } from 'node:url';

import { ESLintUtils } from '@typescript-eslint/utils';

const projectRoot = posix.normalize(path.dirname(fileURLToPath(import.meta.url)));

const createRule = ESLintUtils.RuleCreator((name) => name);

export default createRule({
  name: 'no-relative-parent-import',
  meta: {
    type: 'problem',
    docs: {
      recommended: 'error',
      suggestion: true,
      requiresTypeChecking: false,
      description: 'forbidden relative parent import',
    },
    fixable: 'code',
    schema: [],
    messages: {
      import: "do not use relative parent import, use '{{ should }}' instead",
    },
  },
  defaultOptions: [],

  create: (context) => {
    const filename = context.filename;
    return {
      ImportDeclaration: (node) => {
        if (node.source.value.startsWith('..')) {
          const importPath = path.resolve(path.dirname(filename), node.source.value);
          const should = posix.normalize(
            posix.join('@app', path.relative(projectRoot, importPath).replaceAll('\\', '/')),
          );

          context.report({
            node,
            messageId: 'import',
            data: { should },
            fix: (fixer) => {
              return fixer.replaceTextRange(node.source.range, JSON.stringify(should));
            },
          });
        }
      },
    };
  },
});
