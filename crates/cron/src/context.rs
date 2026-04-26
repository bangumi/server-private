use anyhow::{Context, Result};
use bangumi_config::AppConfig;
use bb8::Pool;
use bb8_redis::RedisConnectionManager;
use spdlog::info;
use sqlx::mysql::MySqlPoolOptions;
use sqlx::MySqlPool;

#[derive(Clone)]
pub(crate) struct CronContext {
  pub redis_pool: Pool<RedisConnectionManager>,
  pub mysql_pool: MySqlPool,
}

impl CronContext {
  pub async fn new(config: &AppConfig) -> Result<Self> {
    info!("cron context: creating redis pool, uri={}", config.redis_uri);
    let manager = RedisConnectionManager::new(config.redis_uri.as_str())
      .context("failed to create redis manager")?;
    let redis_pool = Pool::builder()
      .max_size(16)
      .build(manager)
      .await
      .context("failed to build redis pool")?;
    info!("cron context: redis pool ready, max_size=16");

    info!("cron context: creating mysql pool");
    let mysql_pool = MySqlPoolOptions::new()
      .max_connections(8)
      .connect(&config.mysql.database_url())
      .await
      .context("failed to build mysql pool")?;
    info!("cron context: mysql pool ready, max_connections=8");

    Ok(Self {
      redis_pool,
      mysql_pool,
    })
  }
}
