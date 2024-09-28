import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  overwrite: true,
  schema: 'lib/graphql/schema.graphql',
  config: {
    // strictScalars: true,
    // noSchemaStitching: false,
    useTypeImports: true,
    contextType: '@app/lib/graphql/context.ts#Context',
  },
  generates: {
    'lib/graphql/__generated__/resolvers.ts': {
      plugins: ['typescript', 'typescript-resolvers'],
      config: {
        // defaultMapper: 'DeepPartial<{T}>',
      },
    },
    // "./graphql.schema.json": {
    //   plugins: ["introspection"]
    // }
  },
};

export default config;
