// lint-staged.config.js
export default {
  '*.{md,html,json,cjs,mjs,js,yml,yaml}': 'prettier -w',
  '**/pre-commit': 'prettier -w',
  '*.dockerfile': 'prettier -w',
  '*.ts': ['eslint --fix', 'prettier -w', () => 'tsc -p tsconfig.json --pretty --noEmit'],
};
