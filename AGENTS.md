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
- `pnpm run build` — production build (esbuild)
- `pnpm test` — run vitest (non-watch)
- `pnpm run codegen` — GraphQL TypeScript codegen
- `pnpm run generate:pb` — protobuf codegen (`buf generate`)
- `pnpm run drizzle-pull` — database schema introspection
- `pnpm run lint` — ESLint
- `pnpm run format` — Prettier

avoid using npm/npx tools, use `pnpm` or `pnpm exec` instead.

## Conventions

- Config loaded from `config.yaml`, env vars override (e.g. `MYSQL_DB` overrides `mysql.db`)
- Auth via `req.auth` decorator on Fastify requests
- TypeORM entities in `lib/orm/entity/`
- Notification types defined in `lib/notify.ts`
- Kafka topic handlers registered in `bin/mq.ts` serviceHandlers map
- Husky + lint-staged for pre-commit hooks
- TypeBox schema variables 使用 PascalCase（如 `ChallengePayloadSchema`）
- 对应的 `Static<typeof ...>` 类型使用 `I` 前缀命名（如 `IChallengePayload`）
- 所有写接口（topic、回复、小组、日志、吐槽等）的用户输入必须按统一清理清单处理：
  `trim` → NFC normalize → 不可见字符检查（`Dam.allCharacterPrintable`）→ 长度限制（按 code point 计数，如日志正文 ≤100000）→ 敏感词检查（`dam.needReview`）；
  标签类输入走 `validateTags`；触发任一项按接口语义返回 400（或对齐既有接口的 BAN/403 处理）
