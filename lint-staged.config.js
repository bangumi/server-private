// lint-staged.config.js
export default {
  '*.{md,html,json,cts,cjs,mjs,js,yml,yaml,liquid,dockerfile}': 'prettier -w',
  '*.{cts,cjs,mjs,js}': 'eslint --fix',
  '**/pre-commit': 'prettier -w',
  '.{git,docker}ignore': 'prettier -w',
  '*.ts': [
    'prettier -w',
    () => 'tsc -p tsconfig.json --pretty --noEmit', // do not pass filenames
    'eslint --fix',
  ],
};
