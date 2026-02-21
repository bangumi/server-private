mod context;
mod helpers;
mod topics;
mod types;

use anyhow::{Context, Result};
use bangumi_config::AppConfig;
use rdkafka::consumer::{Consumer, StreamConsumer};
use rdkafka::{ClientConfig, Message};
use spdlog::{error, info, warn};

use context::MqContext;
use helpers::parse_json;
use types::{DebeziumEnvelope, KafkaMessageOwned};

const MQ_GROUP_ID: &str = "server-private";
const TOPICS: &[&str] = &[
  "debezium.chii.bangumi.chii_blog_entry",
  "debezium.chii.bangumi.chii_characters",
  "debezium.chii.bangumi.chii_episodes",
  "debezium.chii.bangumi.chii_groups",
  "debezium.chii.bangumi.chii_group_members",
  "debezium.chii.bangumi.chii_group_topics",
  "debezium.chii.bangumi.chii_index",
  "debezium.chii.bangumi.chii_members",
  "debezium.chii.bangumi.chii_friends",
  "debezium.chii.bangumi.chii_persons",
  "debezium.chii.bangumi.chii_subject_fields",
  "debezium.chii.bangumi.chii_subject_topics",
  "debezium.chii.bangumi.chii_subjects",
  "debezium.chii.bangumi.chii_subject_revisions",
];

pub async fn placeholder(config: &AppConfig) -> Result<()> {
  run(config).await
}

pub async fn run(config: &AppConfig) -> Result<()> {
  let ctx = MqContext::new(config).await?;
  let consumer = new_consumer(config)?;
  consumer
    .subscribe(TOPICS)
    .context("failed to subscribe kafka topics")?;

  info!(
    "mq worker started, kafka_brokers={}, group_id={}, topics={}",
    config.kafka_brokers,
    MQ_GROUP_ID,
    TOPICS.join(",")
  );

  loop {
    let message = match consumer.recv().await {
      Ok(message) => message,
      Err(err) => {
        error!("failed to receive kafka message: {}", err);
        continue;
      }
    };

    let topic = message.topic().to_owned();
    let key = match message.key_view::<str>() {
      Some(Ok(key)) => key.to_owned(),
      _ => continue,
    };
    let value = match message.payload_view::<str>() {
      Some(Ok(value)) => value.to_owned(),
      _ => continue,
    };

    let msg = KafkaMessageOwned { topic, key, value };
    if let Err(err) = process_message(&ctx, &msg).await {
      error!("error processing message key={}, error={}", msg.key, err);
    }
  }
}

fn new_consumer(config: &AppConfig) -> Result<StreamConsumer> {
  if config.kafka_brokers.trim().is_empty() {
    anyhow::bail!("KAFKA_BROKERS is not set");
  }

  let consumer: StreamConsumer = ClientConfig::new()
    .set("bootstrap.servers", &config.kafka_brokers)
    .set("group.id", MQ_GROUP_ID)
    .set("auto.offset.reset", "latest")
    .set("enable.auto.commit", "true")
    .create()
    .context("failed to create kafka consumer")?;
  Ok(consumer)
}

async fn process_message(ctx: &MqContext, msg: &KafkaMessageOwned) -> Result<()> {
  if !msg.topic.starts_with("debezium.") {
    warn!(
      "non-debezium topic is disabled in rust mq for now, topic={}, key={}",
      msg.topic, msg.key
    );
    return Ok(());
  }

  on_binlog_message(ctx, msg).await
}

async fn on_binlog_message(ctx: &MqContext, msg: &KafkaMessageOwned) -> Result<()> {
  let envelope: DebeziumEnvelope = parse_json(&msg.value, "debezium payload")?;

  match envelope.source.table.as_str() {
    "chii_blog_entry" => topics::chii_blog_entry::handle(ctx, msg).await,
    "chii_characters" => topics::chii_characters::handle(ctx, msg).await,
    "chii_episodes" => topics::chii_episodes::handle(ctx, msg).await,
    "chii_groups" => topics::chii_groups::handle(ctx, msg).await,
    "chii_group_members" => topics::chii_group_members::handle(ctx, msg).await,
    "chii_group_topics" => topics::chii_group_topics::handle(ctx, msg).await,
    "chii_index" => topics::chii_index::handle(ctx, msg).await,
    "chii_members" => topics::chii_members::handle(ctx, msg).await,
    "chii_friends" => topics::chii_friends::handle(ctx, msg).await,
    "chii_persons" => topics::chii_persons::handle(ctx, msg).await,
    "chii_subject_fields" => topics::chii_subject_fields::handle(ctx, msg).await,
    "chii_subject_topics" => topics::chii_subject_topics::handle(ctx, msg).await,
    "chii_subjects" => topics::chii_subjects::handle(ctx, msg).await,
    "chii_subject_revisions" => topics::chii_subject_revisions::handle(ctx, msg).await,
    "chii_timeline" => {
      warn!(
        "timeline debezium handler is temporarily disabled in Rust mq, key={}",
        msg.key
      );
      Ok(())
    }
    _ => Ok(()),
  }
}
