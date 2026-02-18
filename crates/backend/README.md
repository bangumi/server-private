# Rust Backend Entry (Phase 1)

This crate is the binary entrypoint for Rust migration.

The executable is organized as one binary with multiple subcommands:

- `server ...`
- `mq ...`
- `cron ...`

Current scope:

- dispatches `cron` commands to `bangumi-cron` crate
- dispatches `mq` commands to `bangumi-mq` crate
- loads shared config from `bangumi-config` crate
- `server` placeholder command for future path-splitting HTTP entrypoint

Current migration priority:

1. Finish `cron` migration and parity validation
2. Start `mq` refactor after cron is stable

## Commands

Run once:

- `cargo run -- server placeholder`
- `cargo run -- cron heartbeat-once`
- `cargo run -- cron trending-subjects-once`
- `cargo run -- cron trending-subject-topics-once`
- `cargo run -- cron truncate-global-once`
- `cargo run -- cron truncate-inbox-once`
- `cargo run -- cron truncate-user-once`
- `cargo run -- cron cleanup-expired-access-tokens-once`
- `cargo run -- cron cleanup-expired-refresh-tokens-once`

Run minimal loop:

- `cargo run -- cron run-default-schedule`

Notes:

- `cleanupExpiredAccessTokens` and `cleanupExpiredRefreshTokens` are implemented in Rust but disabled in default scheduler to avoid duplicate execution during migration.

MQ placeholder:

- `cargo run -- mq placeholder`

## Environment

- `REDIS_URI` (default: `redis://127.0.0.1:3306/0`)
- `NODE_ENV` (`production` => json log; other values => text log)
- `LOG_FORMAT` (`json|text`, overrides `NODE_ENV`)
- `TOKIO_RUNTIME` (`current|current_thread|single|single_thread|multi|multi_thread`)
- `TOKIO_WORKER_THREADS` (only effective when runtime mode is multi-thread)

## Behavior alignment targets

- Heartbeat key: `task:heartbeat`
- Global timeline key: `tml:v3:inbox:0`, keep latest 1000 (`ZREMRANGEBYRANK key 0 -1001`)
- User timeline keys: `tml:v3:user:*`, keep latest 200 (`ZREMRANGEBYRANK key 0 -201`)
- Inbox timeline keys: `tml:v3:inbox:*`, keep latest 200 (`ZREMRANGEBYRANK key 0 -201`)

## Workspace crates

- `crates/backend`: binary entrypoint and subcommand dispatch
- `crates/config`: loads YAML + env config (`CHII_CONFIG_FILE`, `REDIS_URI`, `KAFKA_BROKERS`)
- `crates/cron`: cron task implementations
- `crates/mq`: mq task implementations (placeholder)
- `crates/api`: api placeholder crate
