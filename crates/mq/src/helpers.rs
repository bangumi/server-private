use anyhow::{Context, Result};
use bb8_redis::redis::AsyncCommands;
use serde::de::DeserializeOwned;
use serde_json::Value;

use crate::context::MqContext;
use crate::types::{DebeziumPayload, KafkaMessageOwned};

pub fn parse_json<T>(input: &str, label: &str) -> Result<T>
where
  T: DeserializeOwned,
{
  serde_json::from_str(input).with_context(|| format!("failed to parse {}", label))
}

pub fn parse_debezium_payload<T>(input: &str) -> Result<DebeziumPayload<T>>
where
  T: DeserializeOwned,
{
  parse_json(input, "debezium payload")
}

pub fn is_update_or_delete(op: &str) -> bool {
  op == "u" || op == "d"
}

pub fn is_change(op: &str) -> bool {
  op == "c" || op == "u" || op == "d"
}

pub async fn del_keys(ctx: &MqContext, keys: &[String]) -> Result<()> {
  if keys.is_empty() {
    return Ok(());
  }

  let mut redis = ctx
    .redis_pool
    .get()
    .await
    .context("failed to get redis connection from pool")?;
  redis
    .del::<_, ()>(keys)
    .await
    .context("failed to delete redis keys")?;
  Ok(())
}

pub async fn handle_slim_invalidation<K, F>(
  ctx: &MqContext,
  msg: &KafkaMessageOwned,
  key_prefix: &str,
  extract_id: F,
) -> Result<()>
where
  K: DeserializeOwned,
  F: FnOnce(K) -> i64,
{
  let payload: DebeziumPayload<Value> = parse_debezium_payload(&msg.value)?;
  if !is_update_or_delete(&payload.op) {
    return Ok(());
  }

  let key: K = parse_json(&msg.key, "debezium key")?;
  let id = extract_id(key);
  del_keys(ctx, &[format!("{}:{}", key_prefix, id)]).await
}
