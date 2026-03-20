use anyhow::Result;
use serde::Deserialize;

use crate::context::MqContext;
use crate::helpers::handle_slim_invalidation;
use crate::types::KafkaMessageOwned;

#[derive(Debug, Deserialize)]
struct PersonKey {
  prsn_id: i64,
}

pub async fn handle(ctx: &MqContext, msg: &KafkaMessageOwned) -> Result<()> {
  handle_slim_invalidation::<PersonKey, _>(ctx, msg, "prsn:v3:slim", |key| key.prsn_id)
    .await
}
