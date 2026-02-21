use anyhow::Result;
use serde::Deserialize;

use crate::context::MqContext;
use crate::helpers::handle_slim_invalidation;
use crate::types::KafkaMessageOwned;

#[derive(Debug, Deserialize)]
struct CharacterKey {
  crt_id: i64,
}

pub async fn handle(ctx: &MqContext, msg: &KafkaMessageOwned) -> Result<()> {
  handle_slim_invalidation::<CharacterKey, _>(ctx, msg, "crt:v2:slim", |key| key.crt_id)
    .await
}
