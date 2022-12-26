// remove this after https://github.com/import-js/eslint-plugin-import/issues/2467 is fixed

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'forbidden relative parent import',
      category: 'Stylistic Issues',
    },
    schema: [],
  },

  create: (context) => {
    return {
      'Program > ImportDeclaration': (node) => {
        if (node.source.value.startsWith('../')) {
          context.report({
            node,
            message: 'do not use relative parent import, use absolute import start with "app/..."',
          });
        }
      },
    };
  },
};
