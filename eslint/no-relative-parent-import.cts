// remove this after https://github.com/import-js/eslint-plugin-import/issues/2467 is fixed

import path from 'node:path';
import posix from 'node:path/posix';

import { ESLintUtils } from '@typescript-eslint/utils';

const rootDir = posix.normalize(path.dirname(__dirname));

const createRule = ESLintUtils.RuleCreator((name) => name);

// 不要用 export default 重写， esbuild 不会处理成 cjs 的默认导出。
module.exports = createRule({
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
    const filename = context.getFilename();
    return {
      ImportDeclaration: (node) => {
        if (node.source.value.startsWith('../')) {
          const dstPath = path.resolve(path.dirname(filename), node.source.value);
          const should = posix.normalize(
            posix.join('@app', path.relative(rootDir, dstPath).replaceAll('\\', '/')),
          );

          context.report({
            node,
            messageId: 'import',
            data: { should },
            fix: (fixer) => {
              return fixer.replaceTextRange(node.source.range, "'" + should + "'");
            },
          });
        }
      },
    };
  },
});
