import * as buffer from 'node:buffer';
import * as fs from 'node:fs/promises';

import { afterAll, beforeAll, expect, test, vi } from 'vitest';

import * as impl from './fs';

beforeAll(async () => {
  await fs.rm('./tmp', { recursive: true, force: true });
});

afterAll(async () => {
  await fs.rm('./tmp', { recursive: true, force: true });
});

vi.mock('@app/lib/config', () => {
  return {
    default: {
      image: {
        fs: { path: './tmp/images' },
      },
    },
  };
});

test('should update image', async () => {
  await impl.uploadImage('1/2/3/4.txt', buffer.Buffer.from('hello world'));
  const content = await fs.readFile('./tmp/images/1/2/3/4.txt');

  expect(content.toString()).toBe('hello world');
});
