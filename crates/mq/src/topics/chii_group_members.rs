use anyhow::Result;
use serde::Deserialize;

use crate::context::MqContext;
use crate::helpers::{del_keys, is_change, parse_debezium_payload};
use crate::types::{DebeziumPayload, KafkaMessageOwned};

#[derive(Debug, Deserialize)]
struct GroupMemberRow {
  gmb_uid: i64,
}

pub async fn handle(ctx: &MqContext, msg: &KafkaMessageOwned) -> Result<()> {
  let payload: DebeziumPayload<GroupMemberRow> = parse_debezium_payload(&msg.value)?;
  if !is_change(&payload.op) {
    return Ok(());
  }

  let uid = payload
    .before
    .as_ref()
    .map(|value| value.gmb_uid)
    .or_else(|| payload.after.as_ref().map(|value| value.gmb_uid));

  if let Some(uid) = uid {
    del_keys(ctx, &[format!("user:groups:{}", uid)]).await?;
  }

  Ok(())
}
