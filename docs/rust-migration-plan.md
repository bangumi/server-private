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

## Phase 1 Scope (in progress)

### Included

- Cron: `heartbeat`
- Cron: timeline cache truncation
  - global cache keep 1000
  - user/inbox cache keep 200
- Cron: trending tasks (`trendingSubjects`, `trendingSubjectTopics`) migrated
- Cron: oauth cleanup commands (`cleanupExpiredAccessTokens`, `cleanupExpiredRefreshTokens`) migrated as manual commands
- MQ: keep placeholder entrypoint only (no behavior migration in this phase)

### Excluded

- GraphQL and REST handlers
- socket.io and SSE runtime
- OpenAPI migration implementation
- MQ Debezium production handlers (next phase)

## Source-of-truth behavior (must match existing TS)

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

## Rust implementation status

- Binary crate: [crates/backend](../crates/backend)
- CLI entry: [crates/backend/src/main.rs](../crates/backend/src/main.rs)
- Usage notes: [crates/backend/README.md](../crates/backend/README.md)
- Split crates: [crates/api](../crates/api), [crates/cron](../crates/cron), [crates/mq](../crates/mq), [crates/config](../crates/config)

Current commands:

- `cargo run -p bangumi-backend -- server placeholder`
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

Scheduler note:

- In Rust default scheduler, oauth cleanup jobs are intentionally disabled during migration cutover.

TS handoff rule:

- When a cron task is migrated to Rust, disable the corresponding job registration in [bin/cron.ts](../bin/cron.ts).
- At the disabled location, add a short comment pointing to the Rust command used to run that task.
- Goal: avoid duplicate execution while keeping rollback path explicit.

PR checklist template (per migrated cron task):

- [ ] Rust implementation added and callable via `cargo run -p bangumi-backend -- cron <task>-once`
- [ ] TS registration removed/disabled in [bin/cron.ts](../bin/cron.ts)
- [ ] Inline handoff comment added in TS with Rust command
- [ ] Rust scheduler enable/disable state explicitly documented
- [ ] Manual run completed in staging and output verified
- [ ] Rollback command/path documented in PR description

Current TS status:

- TS cron keeps `heartbeat` enabled.
- TS cron registrations for `trending`, `timeline truncate`, and `oauth cleanup` are disabled with Rust handoff comments.

## Acceptance checklist (Phase 1)

- [ ] Redis keys and trim counts exactly match TS behavior.
- [ ] Error logs are visible and include task context.
- [ ] No unexpected Redis key pattern touched outside target prefixes.
- [ ] `cron run-default-schedule` is stable for long-running execution.

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

1. Add Rust scheduler parity for full cron expressions and `Asia/Shanghai` timezone.
2. Complete remaining cron jobs (oauth/trending) with parity checks.
3. Add parity test harness (TS vs Rust same input/output for Redis mutations).
4. After cron parity is complete, begin MQ cache-invalidation handler refactor.
