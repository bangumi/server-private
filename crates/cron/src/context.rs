use anyhow::{Context, Result};
use bb8::Pool;
use bb8_redis::RedisConnectionManager;
use bgm_config::AppConfig;
use sqlx::mysql::MySqlPoolOptions;
use sqlx::MySqlPool;

#[derive(Clone)]
pub(crate) struct CronContext {
    pub redis_pool: Pool<RedisConnectionManager>,
    pub mysql_pool: MySqlPool,
}

impl CronContext {
    pub async fn new(config: &AppConfig) -> Result<Self> {
        let manager = RedisConnectionManager::new(config.redis_uri.as_str())
            .context("failed to create redis manager")?;
        let redis_pool = Pool::builder()
            .max_size(16)
            .build(manager)
            .await
            .context("failed to build redis pool")?;

        let mysql_pool = MySqlPoolOptions::new()
            .max_connections(8)
            .connect(&config.mysql.database_url())
            .await
            .context("failed to build mysql pool")?;

        Ok(Self {
            redis_pool,
            mysql_pool,
        })
    }
}
