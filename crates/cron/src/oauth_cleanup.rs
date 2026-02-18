use std::time::Duration;

use anyhow::{Context, Result};
use chrono::Duration as ChronoDuration;
use chrono::Utc;
use spdlog::info;

use crate::context::CronContext;

pub(crate) async fn cleanup_expired_access_tokens(ctx: &CronContext) -> Result<()> {
    let not_after = Utc::now() - ChronoDuration::days(7);

    loop {
        let result =
            sqlx::query("DELETE FROM chii_oauth_access_tokens WHERE expires < ? LIMIT 1000")
                .bind(not_after.naive_utc())
                .execute(&ctx.mysql_pool)
                .await
                .context("failed to delete expired access tokens")?;

        let affected_rows = result.rows_affected();
        if affected_rows == 0 {
            info!("No more expired access tokens to delete");
            break;
        }

        info!("Deleted expired access tokens, affected_rows={}", affected_rows);
        tokio::time::sleep(Duration::from_secs(1)).await;
    }

    Ok(())
}

pub(crate) async fn cleanup_expired_refresh_tokens(ctx: &CronContext) -> Result<()> {
    let not_after = Utc::now() - ChronoDuration::days(7);

    loop {
        let result =
            sqlx::query("DELETE FROM chii_oauth_refresh_tokens WHERE expires < ? LIMIT 1000")
                .bind(not_after.naive_utc())
                .execute(&ctx.mysql_pool)
                .await
                .context("failed to delete expired refresh tokens")?;

        let affected_rows = result.rows_affected();
        if affected_rows == 0 {
            info!("No more expired refresh tokens to delete");
            break;
        }

        info!("Deleted expired refresh tokens, affected_rows={}", affected_rows);
        tokio::time::sleep(Duration::from_secs(1)).await;
    }

    Ok(())
}
