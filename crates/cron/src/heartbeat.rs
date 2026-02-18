use std::time::{SystemTime, UNIX_EPOCH};

use anyhow::{Context, Result};
use bb8_redis::redis::AsyncCommands;
use spdlog::info;

use crate::context::CronContext;

const HEARTBEAT_KEY: &str = "task:heartbeat";

pub(crate) async fn run(ctx: &CronContext) -> Result<()> {
    let mut redis = ctx
        .redis_pool
        .get()
        .await
        .context("failed to get redis connection from pool")?;

    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .context("system clock before unix epoch")?
        .as_millis() as u64;

    redis
        .set::<_, _, ()>(HEARTBEAT_KEY, now)
        .await
        .context("failed to set heartbeat key")?;

    info!("heartbeat updated, key={}, value={}", HEARTBEAT_KEY, now);
    Ok(())
}
