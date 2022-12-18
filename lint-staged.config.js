// lint-staged.config.js
export default {
  '*.{ts,md,html,json,cjs,mjs,js,yml,yaml,prisma}': 'prettier -w',
  '**/pre-commit': 'prettier -w',
  Dockerfile: 'prettier -w',
  '*.ts': ['eslint', () => 'tsc -p tsconfig.json --pretty --noEmit'],
};
