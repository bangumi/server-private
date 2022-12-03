module.exports = {
  extends: [
    "eslint:recommended",
    "plugin:import/recommended",
    "plugin:import/typescript",
    "plugin:promise/recommended",
    "plugin:n/recommended",
  ],
  plugins: ["@typescript-eslint", "import"],
  ignorePatterns: ["**/dist/*", "lib/generated/**/*"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    sourceType: "module",
    project: "./tsconfig.json",
    ecmaVersion: 2022,
  },
  env: {
    browser: false,
    node: true,
  },
  rules: {
    "n/no-missing-import": "off",
    "linebreak-style": ["error", "unix"],
    indent: ["error", 2],
    "array-element-newline": ["error", "consistent"],
    "array-bracket-newline": ["error", "consistent"],
    "promise/catch-or-return": ["error", { allowFinally: true }],
    "@typescript-eslint/object-curly-spacing": ["error", "always"],
    "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }],
    "@typescript-eslint/quotes": ["error", "double", { avoidEscape: true }],
    quotes: ["error", "double", { avoidEscape: true }],
    "@typescript-eslint/member-delimiter-style": [
      "error",
      {
        multiline: {
          delimiter: "semi",
          requireLast: true,
        },
        singleline: {
          delimiter: "semi",
          requireLast: false,
        },
        multilineDetection: "brackets",
      },
    ],
    "@typescript-eslint/space-before-function-paren": [
      "error",
      {
        anonymous: "always",
        named: "never",
        asyncArrow: "always",
      },
    ],
    "space-before-function-paren": [
      "error",
      {
        anonymous: "always",
        named: "never",
        asyncArrow: "always",
      },
    ],
    "@typescript-eslint/semi": ["error", "always"],
    semi: ["error", "always"],
    "comma-dangle": [
      "error",
      {
        arrays: "always-multiline",
        objects: "always-multiline",
        imports: "always-multiline",
        exports: "always-multiline",
        functions: "ignore",
      },
    ],
    "import/no-unused-modules": [
      1,
      {
        unusedExports: true,
      },
    ],
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": ["error", { varsIgnorePattern: "_" }],
    "@typescript-eslint/strict-boolean-expressions": "off",
    "import/order": [
      "error",
      {
        "newlines-between": "always",
        groups: ["builtin", "external", ["index", "sibling", "parent"], "internal", "object"],
      },
    ],
  },
  settings: {
    "import/parsers": {
      "@typescript-eslint/parser": [".ts"],
    },
    "import/resolver": {
      typescript: {},
    },
  },
};
