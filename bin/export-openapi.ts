import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import * as lodash from 'lodash-es';
import { format, resolveConfig } from 'prettier';

import { projectRoot } from '@app/lib/config.ts';
import { createServer } from '@app/lib/server.ts';

const app = await createServer();

const pri = await app.inject('/p1/openapi.json');
const outFile = path.resolve(projectRoot, 'openapi.json');

const body = JSON.stringify(lodash.omit(JSON.parse(pri.body), 'info.version'), null, 2);
const config = await resolveConfig(outFile);
const output = await format(body, { ...config, parser: 'json' });

await fs.writeFile(outFile, output);
