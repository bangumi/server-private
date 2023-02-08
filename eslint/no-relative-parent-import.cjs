// TODO: remove this after https://github.com/import-js/eslint-plugin-import/issues/2467 is fixed

const path = require('node:path');
const posix = require('node:path/posix');

const { ESLintUtils } = require('@typescript-eslint/utils');

const projectRoot = posix.normalize(path.dirname(__dirname));

const createRule = ESLintUtils.RuleCreator((name) => name);

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
              return fixer.replaceTextRange(node.source.range, "'" + should + "'");
            },
          });
        }
      },
    };
  },
});
