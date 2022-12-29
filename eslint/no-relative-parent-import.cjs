// remove this after https://github.com/import-js/eslint-plugin-import/issues/2467 is fixed

const path = require('path');
const posix = require('path/posix');

const rootDir = posix.normalize(path.dirname(__dirname));

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'forbidden relative parent import',
      category: 'Stylistic Issues',
    },
    fixable: 'code',
    schema: [],
  },

  create: (context) => {
    const filename = context.getFilename();
    return {
      'Program > ImportDeclaration': (node) => {
        if (node.source.value.startsWith('../')) {
          const dstPath = path.resolve(path.dirname(filename), node.source.value);
          const should = posix.normalize(
            posix.join('@app', path.relative(rootDir, dstPath).replaceAll('\\', '/')),
          );

          context.report({
            node,
            message: `do not use relative parent import, use '${should}' instead`,
            fix: (fixer) => {
              return fixer.replaceTextRange(node.source.range, "'" + should + "'");
            },
          });
        }
      },
    };
  },
};
