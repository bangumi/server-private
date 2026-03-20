use anyhow::Result;
use serde::Deserialize;

use crate::context::MqContext;
use crate::helpers::handle_slim_invalidation;
use crate::types::KafkaMessageOwned;

#[derive(Debug, Deserialize)]
struct SubjectTopicKey {
  sbj_tpc_id: i64,
}

pub async fn handle(ctx: &MqContext, msg: &KafkaMessageOwned) -> Result<()> {
  handle_slim_invalidation::<SubjectTopicKey, _>(ctx, msg, "sbj:topic", |key| {
    key.sbj_tpc_id
  })
  .await
}
