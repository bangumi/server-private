// lint-staged.config.js
export default {
  '*.{md,html,json,cts,cjs,mjs,js,yml,yaml,liquid}': 'prettier -w',
  '*.{cts,cjs,mjs,js}': 'eslint --quiet --fix',
  '*.ts': [
    () => 'tsc -p tsconfig.json --pretty --noEmit', // do not pass filenames
    'eslint --quiet --fix',
    'prettier -w',
  ],
};
