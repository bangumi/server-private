# Rust Migration Plan (Incremental, path-splitting)

Updated: 2026-02-19

## Goal

Migrate from TypeScript to Rust incrementally.

- API gateway/server routes forward different path groups to TS or Rust implementations.
- Keep production stable while replacing internals step-by-step.
- Start with background workers first, with strict order: finish `cron` migration, then refactor `mq`.

## Architecture Strategy

### Single executable model

- Rust side uses one executable with subcommands: `server`, `mq`, `cron`.
- Deployment can run the same image/binary with different startup args.
- This keeps runtime packaging simple while migration is in progress.

### Request routing

- Keep current TS server as primary entrypoint.
- Introduce Rust services behind internal routing.
- Path-based forwarding decides which implementation handles each API path.

### Worker migration order

1. Complete `cron` migration (all tasks + scheduler parity)
2. Stabilize `cron` observability and rollback playbook
3. Start `mq` refactor (cache invalidation topics first)
4. Finish `mq` high-risk topics (DB/timeline-sensitive)

## Timeline A: Worker migration (`cron` -> `mq`)

Status: `in progress`

### Current scope

#### Included

- Cron: `heartbeat`
- Cron: timeline cache truncation
  - global cache keep 1000
  - user/inbox cache keep 200
- Cron: trending tasks (`trendingSubjects`, `trendingSubjectTopics`) migrated
- Cron: oauth cleanup commands (`cleanupExpiredAccessTokens`, `cleanupExpiredRefreshTokens`) migrated as manual commands
- MQ: keep placeholder entrypoint only (no behavior migration in this phase)

Migration note (temporary decision):

- `subject date updater` is currently handled by JS broker.
- JS side keeps only required binlog subscriptions for this path: `debezium.chii.bangumi.chii_subjects` and `debezium.chii.bangumi.chii_subject_revisions`.
- Rust side keeps parser infrastructure only (`crates/wiki-parser`) and related tests, but runtime event handling in Rust mq is intentionally disabled until later migration stage.

#### Excluded

- MQ Debezium production handlers (next phase)

### Source-of-truth behavior (must match existing TS)

- `task:heartbeat` updated with current epoch milliseconds
- `tml:v3:inbox:0` trimmed via `ZREMRANGEBYRANK 0 -1001`
- `tml:v3:user:*` trimmed via `ZREMRANGEBYRANK 0 -201`
- `tml:v3:inbox:*` trimmed via `ZREMRANGEBYRANK 0 -201`
- Existing timezone requirement remains `Asia/Shanghai` at scheduling layer

Reference files:

- [bin/cron.ts](../bin/cron.ts)
- [tasks/heartbeat.ts](../tasks/heartbeat.ts)
- [tasks/timeline.ts](../tasks/timeline.ts)
- [lib/timeline/cache.ts](../lib/timeline/cache.ts)
- [bin/mq.ts](../bin/mq.ts)
- [lib/kafka.ts](../lib/kafka.ts)

### TS handoff rule

- When a cron task is migrated to Rust, disable the corresponding job registration in [bin/cron.ts](../bin/cron.ts).
- At the disabled location, add a short comment pointing to the Rust command used to run that task.
- Goal: avoid duplicate execution while keeping rollback path explicit.

### PR checklist template (per migrated cron task)

- [ ] Rust implementation added and callable via `cargo run -p bangumi-backend -- cron <task>-once`
- [ ] TS registration removed/disabled in [bin/cron.ts](../bin/cron.ts)
- [ ] Inline handoff comment added in TS with Rust command
- [ ] Rust scheduler enable/disable state explicitly documented
- [ ] Manual run completed in staging and output verified
- [ ] Rollback command/path documented in PR description

### Current TS status

- TS cron keeps `heartbeat` enabled.
- TS cron registrations for `trending`, `timeline truncate`, and `oauth cleanup` are disabled with Rust handoff comments.

### Acceptance checklist

- [ ] Redis keys and trim counts exactly match TS behavior.
- [ ] Error logs are visible and include task context.
- [ ] No unexpected Redis key pattern touched outside target prefixes.
- [ ] `cron run-default-schedule` is stable for long-running execution.

## Timeline B: API Router migration (OAuth first)

Status: `foundation complete`, `oauth core flow complete`, `parity hardening in progress`.

Implemented in Rust API:

- `GET /oauth/authorize`
  - login gate + login redirect (`/login?backTo=...`)
  - `response_type=code` validation
  - client existence / redirect_uri checks
  - scope parsing and scope description rendering
  - signed CSRF cookie issue/reuse
- `POST /oauth/authorize`
  - login required
  - CSRF token validation
  - client + redirect_uri validation
  - redis authorization code issue (`oauth:code:<code>`, ttl 60)
  - callback redirect with `code` and optional `state`
- `POST /oauth/access_token`
  - grant type support: `authorization_code`, `refresh_token`
  - validation for missing required fields and invalid grant type
  - authorization-code exchange flow
  - refresh-token rotation flow (`FOR UPDATE` + revoke old refresh token)
  - token persistence to `chii_oauth_access_tokens` / `chii_oauth_refresh_tokens`

Infrastructure and tooling:

- OpenAPI endpoint: `GET /openapi.json`
- Backend export command for OpenAPI JSON
- API error envelope unified in Rust (`statusCode` + message)
- DB query helpers now support both `Pool` and `Transaction` via `sqlx::Executor`

Current parity level vs TS:

- Route behavior and major validation branches are aligned for OAuth core paths.
- Rust unit tests cover OAuth route contracts and key validation/error branches.
- Full DB+Redis end-to-end parity scenario (authorize -> code -> token -> refresh with DB assertions) is not yet enabled as default Rust CI test.

API inclusion scope (current):

- OAuth routes (`/oauth/authorize`, `/oauth/access_token`)
- OpenAPI document endpoint (`/openapi.json`)

API exclusion scope (current):

- GraphQL and REST handlers (except OAuth router path)
- socket.io and SSE runtime
- non-OAuth API groups

## Rust implementation status

- Binary crate: [crates/backend](../crates/backend)
- CLI entry: [crates/backend/src/main.rs](../crates/backend/src/main.rs)
- Usage notes: [crates/backend/README.md](../crates/backend/README.md)
- Split crates: [crates/api](../crates/api), [crates/cron](../crates/cron), [crates/mq](../crates/mq), [crates/config](../crates/config)

Current commands:

- `cargo run -p bangumi-backend -- server run`
- `cargo run -p bangumi-backend -- server export-openapi-json -o ./openapi.json`
- `cargo run -p bangumi-backend -- cron heartbeat-once`
- `cargo run -p bangumi-backend -- cron trending-subjects-once`
- `cargo run -p bangumi-backend -- cron trending-subject-topics-once`
- `cargo run -p bangumi-backend -- cron truncate-global-once`
- `cargo run -p bangumi-backend -- cron truncate-inbox-once`
- `cargo run -p bangumi-backend -- cron truncate-user-once`
- `cargo run -p bangumi-backend -- cron cleanup-expired-access-tokens-once`
- `cargo run -p bangumi-backend -- cron cleanup-expired-refresh-tokens-once`
- `cargo run -p bangumi-backend -- cron run-default-schedule`
- `cargo run -p bangumi-backend -- mq placeholder`

API test/lint status snapshot:

- `cargo test -p bangumi-api` passes.
- `cargo clippy -p bangumi-api --tests -- -D warnings` passes.

Worker scheduler note:

- In Rust default scheduler, oauth cleanup jobs are intentionally disabled during migration cutover.

API acceptance checklist:

- [x] OAuth router core flow is implemented in Rust.
- [x] OpenAPI endpoint and export command are available.
- [x] Unit tests cover key OAuth route validation branches.
- [ ] DB+Redis integration parity test (authorize -> code -> token -> refresh) is enabled in Rust CI.

## Rollback policy

- Keep TS cron/mq runnable at all times during migration.
- If Rust worker shows divergence, stop Rust worker and resume TS worker immediately.
- Do not run both workers on the same Kafka consumer group for cutover.

## Context ledger (for future LLM sessions)

### Constraints

- Minimize behavior changes before full parity validation.
- Preserve topic names, cache key formats, and DB schema semantics.
- Implement observability first for each migrated unit.
- For each migrated cron task, enforce TS-side disable + inline handoff comment convention.

### Next planned tasks

1. [Worker] Add Rust scheduler parity for full cron expressions and `Asia/Shanghai` timezone.
2. [Worker] Complete remaining cron jobs (oauth/trending) with parity checks.
3. [API] Add OAuth DB+Redis integration tests in Rust (JS `routes/oauth/index.test.ts` parity path).
4. [API] Add dedicated CI job for Rust OAuth integration tests with MySQL/Redis test fixtures.
5. [Worker] Add parity test harness (TS vs Rust same input/output for Redis mutations).
6. [Worker] After cron parity is complete, begin MQ cache-invalidation handler refactor.

## Migration board (PR tracking)

Use this section as a lightweight checklist when opening migration PRs.

### Worker track

| Unit | TS owner | Rust owner | Status | Rust command | TS handoff | Rollback command |
| --- | --- | --- | --- | --- | --- | --- |
| cron heartbeat | TODO | TODO | in-progress | `cargo run -p bangumi-backend -- cron heartbeat-once` | partial | enable heartbeat in [bin/cron.ts](../bin/cron.ts), stop rust cron worker |
| cron timeline truncate | TODO | TODO | migrated | `cargo run -p bangumi-backend -- cron truncate-global-once` / `truncate-user-once` / `truncate-inbox-once` | done | re-enable timeline jobs in [bin/cron.ts](../bin/cron.ts), stop rust cron worker |
| cron trending | TODO | TODO | migrated | `cargo run -p bangumi-backend -- cron trending-subjects-once` / `trending-subject-topics-once` | done | re-enable trending jobs in [bin/cron.ts](../bin/cron.ts), stop rust cron worker |
| cron oauth cleanup | TODO | TODO | migrated (manual command) | `cargo run -p bangumi-backend -- cron cleanup-expired-access-tokens-once` / `cleanup-expired-refresh-tokens-once` | done | re-enable oauth cleanup in [bin/cron.ts](../bin/cron.ts), stop rust cron worker |
| mq placeholder -> real handlers | TODO | TODO | not-started | `cargo run -p bangumi-backend -- mq placeholder` | n/a | stop rust mq, resume TS mq consumer |

### API track

| Route group | TS owner | Rust owner | Status | Rust command / endpoint | TS handoff | Rollback command |
| --- | --- | --- | --- | --- | --- | --- |
| oauth authorize | TODO | TODO | migrated (core) | `GET/POST /oauth/authorize` | pending gateway split | route `/oauth/*` back to TS server |
| oauth access token | TODO | TODO | migrated (core) | `POST /oauth/access_token` | pending gateway split | route `/oauth/*` back to TS server |
| openapi json | TODO | TODO | migrated | `GET /openapi.json` / `cargo run -p bangumi-backend -- server export-openapi-json -o ./openapi.json` | n/a | switch OpenAPI source back to TS export |
| oauth e2e parity (db+redis) | TODO | TODO | in-progress | Rust integration tests (to be added in CI) | n/a | keep TS oauth route as primary until parity tests pass |

Legend:

- `not-started`: not implemented in Rust yet
- `in-progress`: partial implementation or missing parity/CI items
- `migrated`: Rust path implemented and TS handoff is documented
