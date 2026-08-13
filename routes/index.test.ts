import * as fs from 'node:fs';
import * as path from 'node:path';
import { isDeepStrictEqual } from 'node:util';

import * as lodash from 'lodash-es';
import { expect, test } from 'vitest';

import { projectRoot } from '@app/lib/config.ts';
import { createServer } from '@app/lib/server.ts';

test('should keep openapi spec up to date', async () => {
  const app = await createServer();

  const res = await app.inject({ url: '/p1/openapi.json' });
  expect(res.statusCode).toBe(200);

  // 与 bin/export-openapi.ts 保持一致：导出时忽略 info.version
  const generated = lodash.omit(JSON.parse(res.body), 'info.version');
  const committed = JSON.parse(fs.readFileSync(path.resolve(projectRoot, 'openapi.json'), 'utf8'));

  if (!isDeepStrictEqual(generated, committed)) {
    throw new Error(
      'openapi.json is out of date with the current code. ' +
        'Run `pnpm run file ./bin/export-openapi.ts` to update it.',
    );
  }
}, 15000);
