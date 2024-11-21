// Your bundler file
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as url from 'node:url';

import * as esbuild from 'esbuild';
import { nodeExternalsPlugin } from 'esbuild-node-externals';

const buildConfigs = {
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  sourcemap: 'linked',
  plugins: [
    nodeExternalsPlugin(),
    {
      name: 'import.meta.url',
      // eslint-disable-next-line @typescript-eslint/unbound-method
      setup({ onLoad }) {
        onLoad({ filter: /.*\.ts/g, namespace: 'file' }, (args) => {
          let code = fs.readFileSync(args.path, 'utf8');
          code = code
            .replaceAll(/\bimport\.meta\.url\b/g, JSON.stringify(url.pathToFileURL(args.path)))
            .replaceAll(/\bimport\.meta\.dirname\b/g, JSON.stringify(path.dirname(args.path)));
          return { contents: code, loader: 'ts' };
        });
      },
    },
  ],
};

await esbuild.build({
  entryPoints: ['bin/main.ts'],
  outfile: 'dist/index.mjs',
  ...buildConfigs,
});

await esbuild.build({
  entryPoints: ['bin/cron.ts'],
  outfile: 'dist/cron.js',
  ...buildConfigs,
});
