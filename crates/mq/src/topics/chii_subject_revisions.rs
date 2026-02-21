use anyhow::Result;
use serde_json::Value;
use spdlog::warn;

use crate::helpers::parse_debezium_payload;
use crate::types::{DebeziumPayload, KafkaMessageOwned};

pub async fn handle(
  _ctx: &crate::context::MqContext,
  msg: &KafkaMessageOwned,
) -> Result<()> {
  let payload: DebeziumPayload<Value> = parse_debezium_payload(&msg.value)?;
  if payload.op == "c" || payload.op == "u" {
    warn!(
      "subject date updater is currently disabled in Rust mq (deferred migration), topic={}, key={}",
      msg.topic, msg.key
    );
  }
  Ok(())
}
