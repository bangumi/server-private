import * as path from 'node:path';

import { makeSchema } from 'nexus';

import { projectRoot } from '@app/lib/config.ts';

import types from './types/index.ts';

export const schema = makeSchema({
  types,
  plugins: [],
  outputs: {
    schema: path.join(projectRoot, 'lib', 'graphql', 'schema.gen.graphql'),
  },
});
