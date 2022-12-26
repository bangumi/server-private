import fs from 'node:fs';
import path from 'node:path';

import yaml from 'js-yaml';
import { describe, it, expect } from 'vitest';

import parse from '../parser';

import { projectRoot } from 'app/lib/config';
import { UnreachableError as UnreadableCodeError } from 'app/lib/error';

const testsDir = path.resolve(projectRoot, './lib/utils/wiki/__test_-/wiki-syntax-spec/tests/');
const validTestDir = path.resolve(testsDir, 'valid');
const invalidTestDir = path.resolve(testsDir, 'invalid');

const validTestFiles = fs.readdirSync(validTestDir);
const inValidTestFiles = fs.readdirSync(invalidTestDir);

describe('Wiki syntax parser expected to be valid', () => {
  for (const file of validTestFiles) {
    const [prefix, suffix, ..._] = file.split('.');
    if (suffix !== 'wiki') {
      continue;
    }

    if (!prefix) {
      throw new UnreadableCodeError('BUG: undefined file path prefix');
    }

    it(`${prefix} should be valid`, () => {
      const testFilePath = path.resolve(validTestDir, file);
      const expectedFilePath = path.resolve(validTestDir, `${prefix}.yaml`);

      const testContent = fs.readFileSync(testFilePath, 'utf8');
      const expectedContent = fs.readFileSync(expectedFilePath, 'utf8');

      const result = parse(testContent);
      const expected = yaml.load(expectedContent);

      expect(result).toEqual(expected);
    });
  }
});

describe('Wiki syntax parser expected to be inValid', () => {
  for (const file of inValidTestFiles) {
    const prefix = file.split('.')[0];
    if (!prefix) {
      throw new UnreadableCodeError('BUG: undefined file path prefix');
    }

    it(`${prefix} should be invalid`, () => {
      const testFilePath = path.resolve(invalidTestDir, file);
      const testContent = fs.readFileSync(testFilePath, 'utf8');

      expect(() => parse(testContent)).toThrowError();
    });
  }
});
