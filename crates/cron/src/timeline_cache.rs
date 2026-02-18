use anyhow::{Context, Result};
use bb8_redis::redis::{self};
use bb8_redis::{bb8, RedisConnectionManager};
use spdlog::info;

use crate::context::CronContext;

const TIMELINE_USER_KEY_PATTERN: &str = "tml:v3:user:*";
const TIMELINE_INBOX_KEY_PATTERN: &str = "tml:v3:inbox:*";
const TIMELINE_GLOBAL_KEY: &str = "tml:v3:inbox:0";

pub(crate) async fn truncate_global(ctx: &CronContext) -> Result<()> {
    let mut redis = ctx
        .redis_pool
        .get()
        .await
        .context("failed to get redis connection from pool")?;

    info!("truncating global timeline cache, key={}", TIMELINE_GLOBAL_KEY);
    let removed: i64 = redis::cmd("ZREMRANGEBYRANK")
        .arg(TIMELINE_GLOBAL_KEY)
        .arg(0)
        .arg(-1001)
        .query_async(&mut *redis)
        .await
        .context("failed to truncate global timeline cache")?;

    info!(
        "global timeline cache truncated, key={}, removed={}",
        TIMELINE_GLOBAL_KEY,
        removed
    );
    Ok(())
}

pub(crate) async fn truncate_user(ctx: &CronContext) -> Result<()> {
    let mut redis = ctx
        .redis_pool
        .get()
        .await
        .context("failed to get redis connection from pool")?;
    let keys = scan_zset_keys(&mut redis, TIMELINE_USER_KEY_PATTERN).await?;

    for key in keys {
        info!("truncating user timeline cache, key={}", key);
        let removed: i64 = redis::cmd("ZREMRANGEBYRANK")
            .arg(&key)
            .arg(0)
            .arg(-201)
            .query_async(&mut *redis)
            .await
            .with_context(|| format!("failed to truncate user timeline cache key={key}"))?;

        info!("user timeline cache truncated, key={}, removed={}", key, removed);
    }

    Ok(())
}

pub(crate) async fn truncate_inbox(ctx: &CronContext) -> Result<()> {
    let mut redis = ctx
        .redis_pool
        .get()
        .await
        .context("failed to get redis connection from pool")?;
    let keys = scan_zset_keys(&mut redis, TIMELINE_INBOX_KEY_PATTERN).await?;

    for key in keys {
        info!("truncating inbox timeline cache, key={}", key);
        let removed: i64 = redis::cmd("ZREMRANGEBYRANK")
            .arg(&key)
            .arg(0)
            .arg(-201)
            .query_async(&mut *redis)
            .await
            .with_context(|| format!("failed to truncate inbox timeline cache key={key}"))?;

        info!("inbox timeline cache truncated, key={}, removed={}", key, removed);
    }

    Ok(())
}

async fn scan_zset_keys(
    redis: &mut bb8::PooledConnection<'_, RedisConnectionManager>,
    pattern: &str,
) -> Result<Vec<String>> {
    let mut keys = Vec::new();
    let mut cursor: u64 = 0;

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

        keys.extend(batch);
        if next_cursor == 0 {
            break;
        }
        cursor = next_cursor;
    }

    Ok(keys)
}
