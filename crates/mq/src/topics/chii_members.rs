use anyhow::Result;
use serde::Deserialize;

use crate::context::MqContext;
use crate::helpers::handle_slim_invalidation;
use crate::types::KafkaMessageOwned;

#[derive(Debug, Deserialize)]
struct UserKey {
  uid: i64,
}

pub async fn handle(ctx: &MqContext, msg: &KafkaMessageOwned) -> Result<()> {
  handle_slim_invalidation::<UserKey, _>(ctx, msg, "user:v2:slim", |key| key.uid).await
}
