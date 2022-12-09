import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import { projectRoot } from '../lib/config';
import { createServer } from '../lib/server';

await fs.mkdir(path.resolve(projectRoot, 'dist'), { recursive: true });

const app = await createServer();

const pub = await app.inject('/v0.5/openapi.json');
await fs.writeFile(
  path.resolve(projectRoot, 'dist', 'public.json'),
  JSON.stringify(pub.json(), null, 2),
);

const pri = await app.inject('/p1/openapi.json');
await fs.writeFile(
  path.resolve(projectRoot, 'dist', 'private.json'),
  JSON.stringify(pri.json(), null, 2),
);
