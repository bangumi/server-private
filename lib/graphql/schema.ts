import * as fsp from 'node:fs/promises';
import * as path from 'node:path';

import { extendType, makeSchema, objectType } from 'nexus';

import { projectRoot } from '@app/lib/config.ts';

import types from './types/index.ts';

const _Service = objectType({
  name: '_Service',
  definition(t) {
    t.nonNull.string('sdl');
  },
});

const federationSupport = extendType({
  type: 'Query',
  definition(t) {
    t.nonNull.field('_service', {
      type: '_Service',
      async resolve() {
        return {
          sdl: await fsp.readFile(
            path.join(projectRoot, 'lib', 'graphql', 'schema.gen.graphql'),
            'utf8',
          ),
        };
      },
    });
  },
});

export const schema = makeSchema({
  types: [types, _Service, federationSupport],
  outputs: {
    schema: path.join(projectRoot, 'lib', 'graphql', 'schema.gen.graphql'),
  },
});
