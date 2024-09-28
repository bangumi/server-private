import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  overwrite: true,
  schema: 'lib/graphql/schema.graphql',
  config: {
    contextType: '@app/lib/graphql/context.ts#Context',
  },
  generates: {
    'lib/graphql/__generated__/resolvers.ts': {
      plugins: ['typescript', 'typescript-resolvers'],
    },
    // "./graphql.schema.json": {
    //   plugins: ["introspection"]
    // }
  },
};

export default config;
