use anyhow::Result;
use serde::Deserialize;

use crate::context::MqContext;
use crate::helpers::handle_slim_invalidation;
use crate::types::KafkaMessageOwned;

#[derive(Debug, Deserialize)]
struct GroupKey {
  grp_id: i64,
}

pub async fn handle(ctx: &MqContext, msg: &KafkaMessageOwned) -> Result<()> {
  handle_slim_invalidation::<GroupKey, _>(ctx, msg, "grp:v3:slim", |key| key.grp_id)
    .await
}
