import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import { makeSchema } from 'nexus';

import types from './types/index';
import { production } from '../config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const __projectRoot = path.join(__dirname, '..', '..');

export const schema = makeSchema({
  types,
  plugins: [],
  outputs: production
    ? {}
    : {
      schema: path.join(__projectRoot, 'lib', 'graphql', 'schema.gen.graphql'),
      typegen: {
        declareInputs: true,
        globalsPath: path.join(__projectRoot, 'lib', 'graphql', 'typeDefs.globals.ts'),
        outputPath: path.join(__projectRoot, 'lib', 'graphql', 'typeDefs.ts'),
      },
    },
  formatTypegen: (content, type) => {
    if (type === 'types') {
      return `/* eslint-disable */
      \n ${content}`;
    }
    return content;
  },
  contextType: {
    export: 'Context',
    module: path.join(__projectRoot, 'lib', 'graphql', 'context.ts'),
  },
});
