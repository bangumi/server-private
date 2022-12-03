// lint-staged.config.js
import micromatch from "micromatch";

export default {
  "*.{ts,html,json,cjs,mjs,js}": (files) => {
    const match = micromatch.not(files, "**/lib/generated/**/*");
    return [`prettier -w ${match.join(" ")}`];
  },

  "*.ts": (files) => {
    const match = micromatch.not(files, "**/lib/generated/**/*");
    return [`eslint --fix ${match.join(" ")}`];
  },
};
