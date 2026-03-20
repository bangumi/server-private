use anyhow::Result;
use serde::Deserialize;
use serde_json::Value;

use crate::context::MqContext;
use crate::helpers::{
  del_keys, is_update_or_delete, parse_debezium_payload, parse_json,
};
use crate::types::{DebeziumPayload, KafkaMessageOwned};

#[derive(Debug, Deserialize)]
struct SubjectFieldKey {
  field_sid: i64,
}

pub async fn handle(ctx: &MqContext, msg: &KafkaMessageOwned) -> Result<()> {
  let payload: DebeziumPayload<Value> = parse_debezium_payload(&msg.value)?;
  if !is_update_or_delete(&payload.op) {
    return Ok(());
  }

  let key: SubjectFieldKey = parse_json(&msg.key, "subject field key")?;
  del_keys(
    ctx,
    &[
      format!("sbj:v2:item:{}", key.field_sid),
      format!("sbj:v2:slim:{}", key.field_sid),
    ],
  )
  .await
}
