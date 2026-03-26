# Project Guidelines

## Architecture

TypeScript/Node.js backend for the Bangumi platform. Uses Fastify 5 with TypeBox validation, TypeORM for MySQL, and supports REST + GraphQL (Mercurius) APIs.

Entry points in `bin/`:

- `main.ts` — REST + GraphQL server
- `cron.ts` — scheduled tasks
- `mq.ts` — Kafka consumer (message queue processor)
- `export-openapi.ts` — OpenAPI spec export
- `fix-date.ts` — date fix utility

Key infrastructure: MySQL (TypeORM), Redis (ioredis), Kafka (@confluentinc/kafka-javascript), Meilisearch.

## Code Style

- TypeScript 5.9 strict mode
- Import alias: `@app/*` resolves to project root
- Schema validation: TypeBox for REST, GraphQL schema for queries
- Protobuf: `@bufbuild/protobuf` with generated code in `vendor/proto/`

## Build and Test

- Package manager: pnpm
- `npm run build` — production build (esbuild)
- `npm test` — run vitest (non-watch)
- `npm run codegen` — GraphQL TypeScript codegen
- `npm run generate:pb` — protobuf codegen (`buf generate`)
- `npm run drizzle-pull` — database schema introspection
- `npm run lint` — ESLint
- `npm run format` — Prettier

## Conventions

- Config loaded from `config.yaml`, env vars override (e.g. `MYSQL_DB` overrides `mysql.db`)
- Auth via `req.auth` decorator on Fastify requests
- TypeORM entities in `lib/orm/entity/`
- Notification types defined in `lib/notify.ts`
- Kafka topic handlers registered in `bin/mq.ts` serviceHandlers map
- Husky + lint-staged for pre-commit hooks
