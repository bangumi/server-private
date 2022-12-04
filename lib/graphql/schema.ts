import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import { makeSchema } from 'nexus';

import types from './types/index';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const __projectRoot = path.join(__dirname, '..', '..');

export const schema = makeSchema({
  types,
  plugins: [],
  outputs: {
    schema: path.join(__projectRoot, 'lib', 'graphql', 'schema.gen.graphql'),
  },
  contextType: {
    export: 'Context',
    module: path.join(__projectRoot, 'lib', 'graphql', 'context.ts'),
  },
});
