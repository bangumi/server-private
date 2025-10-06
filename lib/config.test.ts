import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import { Value } from 'typebox/value';
import * as yaml from 'js-yaml';
import * as lo from 'lodash-es';
import { expect, test } from 'vitest';

import { projectRoot, schema, testing, validateConfig } from './config.ts';

test('should be in test env', () => {
  expect(testing).toBe(true);
});

test('validate example config yaml', async () => {
  const raw = await fs.readFile(path.join(projectRoot, 'config.example.yaml'));
  const data = yaml.load(raw.toString());
  validateConfig(lo.merge(Value.Create(schema), data));
});
