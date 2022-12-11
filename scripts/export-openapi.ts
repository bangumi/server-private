import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import * as yaml from 'js-yaml';

import { projectRoot } from '../lib/config';
import { createServer } from '../lib/server';

await fs.mkdir(path.resolve(projectRoot, 'dist'), { recursive: true });

const app = await createServer();

const pub = await app.inject('/v0.5/openapi.json');
await fs.writeFile(
  path.resolve(projectRoot, 'dist', 'public.yaml'),
  yaml.dump(pub.json(), {
    indent: 2,
  }),
);

const pri = await app.inject('/p1/openapi.json');
await fs.writeFile(
  path.resolve(projectRoot, 'dist', 'private.yaml'),
  yaml.dump(pri.json(), {
    indent: 2,
  }),
);
