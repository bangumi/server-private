import * as path from 'node:path';

import { makeSchema } from 'nexus';

import types from './types/index';
import { projectRoot } from '../config';

export const schema = makeSchema({
  types,
  plugins: [],
  outputs: {
    schema: path.join(projectRoot, 'lib', 'graphql', 'schema.gen.graphql'),
  },
});
