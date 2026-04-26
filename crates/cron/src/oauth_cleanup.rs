use std::time::Duration;

use anyhow::{Context, Result};
use chrono::Duration as ChronoDuration;
use chrono::Utc;
use spdlog::info;

use crate::context::CronContext;

pub(crate) async fn cleanup_expired_access_tokens(ctx: &CronContext) -> Result<()> {
  let start = std::time::Instant::now();
  let not_after = Utc::now() - ChronoDuration::days(7);
  info!(
    "oauth cleanup: starting access token cleanup, not_after={}",
    not_after
  );

  let mut total_deleted: u64 = 0;
  loop {
    let result =
      sqlx::query("DELETE FROM chii_oauth_access_tokens WHERE expires < ? LIMIT 1000")
        .bind(not_after.naive_utc())
        .execute(&ctx.mysql_pool)
        .await
        .context("failed to delete expired access tokens")?;

    let affected_rows = result.rows_affected();
    total_deleted += affected_rows;
    if affected_rows == 0 {
      break;
    }

    tokio::time::sleep(Duration::from_secs(1)).await;
  }

  info!(
    "oauth cleanup: access tokens done, total_deleted={}, elapsed={:?}",
    total_deleted,
    start.elapsed()
  );
  Ok(())
}

pub(crate) async fn cleanup_expired_refresh_tokens(ctx: &CronContext) -> Result<()> {
  let start = std::time::Instant::now();
  let not_after = Utc::now() - ChronoDuration::days(7);
  info!(
    "oauth cleanup: starting refresh token cleanup, not_after={}",
    not_after
  );

  let mut total_deleted: u64 = 0;
  loop {
    let result =
      sqlx::query("DELETE FROM chii_oauth_refresh_tokens WHERE expires < ? LIMIT 1000")
        .bind(not_after.naive_utc())
        .execute(&ctx.mysql_pool)
        .await
        .context("failed to delete expired refresh tokens")?;

    let affected_rows = result.rows_affected();
    total_deleted += affected_rows;
    if affected_rows == 0 {
      break;
    }

    tokio::time::sleep(Duration::from_secs(1)).await;
  }

  info!(
    "oauth cleanup: refresh tokens done, total_deleted={}, elapsed={:?}",
    total_deleted,
    start.elapsed()
  );
  Ok(())
}
