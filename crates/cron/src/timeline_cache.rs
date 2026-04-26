use anyhow::{Context, Result};
use bb8_redis::redis::{self};
use bb8_redis::{bb8, RedisConnectionManager};
use spdlog::info;

use crate::context::CronContext;

const TIMELINE_USER_KEY_PATTERN: &str = "tml:v3:user:*";
const TIMELINE_INBOX_KEY_PATTERN: &str = "tml:v3:inbox:*";
const TIMELINE_GLOBAL_KEY: &str = "tml:v3:inbox:0";

pub(crate) async fn truncate_global(ctx: &CronContext) -> Result<()> {
  info!("timeline cache: starting truncate_global");
  let mut redis = ctx
    .redis_pool
    .get()
    .await
    .context("failed to get redis connection from pool")?;

  let removed: i64 = redis::cmd("ZREMRANGEBYRANK")
    .arg(TIMELINE_GLOBAL_KEY)
    .arg(0)
    .arg(-1001)
    .query_async(&mut *redis)
    .await
    .context("failed to truncate global timeline cache")?;

  info!(
    "timeline cache: global truncated, key={}, removed={}",
    TIMELINE_GLOBAL_KEY, removed
  );
  Ok(())
}

pub(crate) async fn truncate_user(ctx: &CronContext) -> Result<()> {
  info!("timeline cache: starting truncate_user");
  let mut redis = ctx
    .redis_pool
    .get()
    .await
    .context("failed to get redis connection from pool")?;
  scan_and_truncate_zset_keys(&mut redis, TIMELINE_USER_KEY_PATTERN, -201, "user")
    .await?;

  Ok(())
}

pub(crate) async fn truncate_inbox(ctx: &CronContext) -> Result<()> {
  info!("timeline cache: starting truncate_inbox");
  let mut redis = ctx
    .redis_pool
    .get()
    .await
    .context("failed to get redis connection from pool")?;
  scan_and_truncate_zset_keys(&mut redis, TIMELINE_INBOX_KEY_PATTERN, -201, "inbox")
    .await?;

  Ok(())
}

async fn scan_and_truncate_zset_keys(
  redis: &mut bb8::PooledConnection<'_, RedisConnectionManager>,
  pattern: &str,
  stop_rank: i32,
  timeline_kind: &str,
) -> Result<()> {
  let start = std::time::Instant::now();
  let mut cursor: u64 = 0;
  let mut total_removed: i64 = 0;
  let mut total_keys: usize = 0;

  loop {
    let (next_cursor, batch): (u64, Vec<String>) = redis::cmd("SCAN")
      .arg(cursor)
      .arg("MATCH")
      .arg(pattern)
      .arg("TYPE")
      .arg("zset")
      .query_async(&mut **redis)
      .await
      .with_context(|| format!("failed to scan redis keys with pattern={pattern}"))?;

    for key in batch {
      let removed: i64 = redis::cmd("ZREMRANGEBYRANK")
        .arg(&key)
        .arg(0)
        .arg(stop_rank)
        .query_async(&mut **redis)
        .await
        .with_context(|| {
          format!(
            "failed to truncate {} timeline cache key={key}",
            timeline_kind
          )
        })?;

      total_removed += removed;
      total_keys += 1;
    }

    if next_cursor == 0 {
      break;
    }
    cursor = next_cursor;
  }

  info!(
    "timeline cache: {} truncated, keys={}, total_removed={}, elapsed={:?}",
    timeline_kind,
    total_keys,
    total_removed,
    start.elapsed()
  );
  Ok(())
}
