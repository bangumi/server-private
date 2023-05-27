import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import * as yaml from 'js-yaml';
import * as lodash from 'lodash-es';

import { projectRoot } from '@app/lib/config';
import { createServer } from '@app/lib/server';

await fs.mkdir(path.resolve(projectRoot, 'dist'), { recursive: true });

const app = await createServer();

const pri = await app.inject('/p1/openapi.yaml');
await fs.writeFile(
  path.resolve(projectRoot, 'dist', 'private.yaml'),
  yaml.dump(lodash.omit(yaml.load(pri.body) as object, 'info.version'), {
    indent: 2,
    sortKeys: true,
  }),
);
