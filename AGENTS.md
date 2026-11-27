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

## Testing

- 测 REST 路由时只挂载被测路由模块，不要用 `createServer()` 全量挂载：fastify 要到首个请求才为每条路由的 response schema 编译 `fast-json-stringify` 序列化器，全量（约 176 条路由）约 2.5s，CI 上约 10s；只挂 1–2 个模块约 70ms。
  - 常规写法：`createTestServer()`（`tests/utils.ts`）+ `await app.register(<被测模块>.setup)`，参考 `routes/private/routes/episode.test.ts`。
  - 测 `/p1` 下的登录态接口还需要补 `@fastify/cookie`、`@fastify/request-context`（`Auth` 里会调 `req.requestContext.set`）、`decorateRequest('auth')`、`Auth` preHandler 和 `addSchemas(app)`，缺任一项会 500。
  - 每个测试文件里同一份 auth 配置只创建一次 app（模块顶层或 `beforeAll`），不要每条用例重建；不同 auth 变体各建一个。
  - 只有测试语义本身要求全量路由时才用 `createServer()`，目前只有 `routes/index.test.ts` 的 openapi.json 快照属于这种情况。
