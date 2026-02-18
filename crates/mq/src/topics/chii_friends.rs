use anyhow::Result;
use serde::Deserialize;

use crate::context::MqContext;
use crate::helpers::{del_keys, is_change, parse_debezium_payload};
use crate::types::{DebeziumPayload, KafkaMessageOwned};

#[derive(Debug, Deserialize)]
struct FriendRow {
  frd_uid: i64,
  frd_fid: i64,
}

pub async fn handle(ctx: &MqContext, msg: &KafkaMessageOwned) -> Result<()> {
  let payload: DebeziumPayload<FriendRow> = parse_debezium_payload(&msg.value)?;
  if !is_change(&payload.op) {
    return Ok(());
  }

  let uid = payload
    .before
    .as_ref()
    .map(|value| value.frd_uid)
    .or_else(|| payload.after.as_ref().map(|value| value.frd_uid));
  let fid = payload
    .before
    .as_ref()
    .map(|value| value.frd_fid)
    .or_else(|| payload.after.as_ref().map(|value| value.frd_fid));

  if let (Some(uid), Some(fid)) = (uid, fid) {
    del_keys(
      ctx,
      &[
        format!("user:friends:{}", uid),
        format!("user:followers:{}", fid),
        format!("user:relation:{}:{}", uid, fid),
      ],
    )
    .await?;
  }

  Ok(())
}
