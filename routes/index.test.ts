import * as yaml from 'js-yaml';
import { expect, test } from 'vitest';

import { createServer } from '@app/lib/server';

test('should build private api spec', async () => {
  const app = await createServer();

  const res = await app.inject({ url: '/p1/openapi.yaml' });
  expect(res.statusCode).toBe(200);
  expect(yaml.load(res.body)).toMatchObject({ info: { title: 'bangumi private api' } });
});
