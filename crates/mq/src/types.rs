use serde::Deserialize;

#[derive(Debug)]
pub struct KafkaMessageOwned {
  pub topic: String,
  pub key: String,
  pub value: String,
}

#[derive(Debug, Deserialize)]
pub struct DebeziumSource {
  pub table: String,
}

#[derive(Debug, Deserialize)]
pub struct DebeziumEnvelope {
  pub source: DebeziumSource,
}

#[derive(Debug, Deserialize)]
pub struct DebeziumPayload<T> {
  pub op: String,
  #[allow(dead_code)]
  pub source: Option<DebeziumSourceMeta>,
  pub before: Option<T>,
  pub after: Option<T>,
}

#[derive(Debug, Deserialize)]
pub struct DebeziumSourceMeta {
  #[allow(dead_code)]
  pub ts_ms: Option<i64>,
}
