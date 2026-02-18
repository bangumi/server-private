use anyhow::Result;
use bangumi_config::AppConfig;
use spdlog::info;

pub async fn placeholder(config: &AppConfig) -> Result<()> {
  info!(
        "mq placeholder ready; next step is to migrate cache-invalidation debezium handlers, kafka_brokers={}",
        config.kafka_brokers
    );
  Ok(())
}
