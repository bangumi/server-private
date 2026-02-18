use anyhow::Result;
use serde::Deserialize;
use serde_json::Value;
use spdlog::warn;

use crate::context::MqContext;
use crate::helpers::{
  del_keys, is_update_or_delete, parse_debezium_payload, parse_json,
};
use crate::types::{DebeziumPayload, KafkaMessageOwned};

#[derive(Debug, Deserialize)]
struct SubjectKey {
  subject_id: i64,
}

pub async fn handle(ctx: &MqContext, msg: &KafkaMessageOwned) -> Result<()> {
  let payload: DebeziumPayload<Value> = parse_debezium_payload(&msg.value)?;

  if is_update_or_delete(&payload.op) {
    let key: SubjectKey = parse_json(&msg.key, "subject key")?;
    del_keys(
      ctx,
      &[
        format!("sbj:v2:item:{}", key.subject_id),
        format!("sbj:v2:slim:{}", key.subject_id),
      ],
    )
    .await?;
  }

  if payload.op == "c" || payload.op == "u" {
    warn!(
      "subject date updater is intentionally kept on JS mq for now, topic={}, key={}",
      msg.topic, msg.key
    );
  }

  Ok(())
}
