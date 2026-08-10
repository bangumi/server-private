import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import * as lodash from 'lodash-es';

import { projectRoot } from '@app/lib/config.ts';
import { createServer } from '@app/lib/server.ts';

const app = await createServer();

const pri = await app.inject('/p1/openapi.json');
await fs.writeFile(
  path.resolve(projectRoot, 'openapi.json'),
  JSON.stringify(lodash.omit(JSON.parse(pri.body), 'info.version'), null, 2),
);
