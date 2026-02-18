use anyhow::{Context, Result};
use bangumi_config::AppConfig;
use clap::{Parser, Subcommand};
use spdlog::formatter::JsonFormatter;
use spdlog::info;
use std::path::PathBuf;
use tokio::runtime::Runtime;

#[derive(Parser, Debug)]
#[command(name = "bangumi-backend")]
#[command(about = "Unified Rust executable for server/mq/cron migration")]
struct Cli {
  #[command(subcommand)]
  command: TopCommand,
}

#[derive(Subcommand, Debug)]
enum TopCommand {
  Server {
    #[command(subcommand)]
    command: ServerCommand,
  },
  Cron {
    #[command(subcommand)]
    command: CronCommand,
  },
  Mq {
    #[command(subcommand)]
    command: MqCommand,
  },
}

#[derive(Subcommand, Debug)]
enum ServerCommand {
  Placeholder,
  Run,
  ExportOpenapiJson {
    #[arg(long, short = 'o', default_value = "openapi.json")]
    output: PathBuf,
  },
}

#[derive(Subcommand, Debug)]
enum CronCommand {
  HeartbeatOnce,
  TrendingSubjectsOnce,
  TrendingSubjectTopicsOnce,
  TruncateGlobalOnce,
  TruncateInboxOnce,
  TruncateUserOnce,
  CleanupExpiredAccessTokensOnce,
  CleanupExpiredRefreshTokensOnce,
  RunDefaultSchedule,
}

#[derive(Subcommand, Debug)]
enum MqCommand {
  Placeholder,
}

#[derive(Clone, Copy)]
enum RuntimeKind {
  CurrentThread,
  MultiThread,
}

impl RuntimeKind {
  fn as_str(self) -> &'static str {
    match self {
      RuntimeKind::CurrentThread => "current_thread",
      RuntimeKind::MultiThread => "multi_thread",
    }
  }
}

fn main() -> Result<()> {
  init_logger_by_env();

  let cli = Cli::parse();

  let runtime = build_runtime(&cli.command)?;
  runtime.block_on(run(cli))
}

async fn run(cli: Cli) -> Result<()> {
  match cli.command {
    TopCommand::Server { command } => match command {
      ServerCommand::Placeholder => {
        bangumi_api::server_placeholder().await?;
      }
      ServerCommand::Run => {
        let config = AppConfig::load()?;
        info!(
          "config loaded for server subcommand, host={}, port={}",
          config.server.host,
          config.server.port
        );
        bangumi_api::run_server(config).await?;
      }
      ServerCommand::ExportOpenapiJson { output } => {
        let json = bangumi_api::export_openapi_json()?;
        std::fs::write(&output, json)
          .with_context(|| format!("failed to write openapi json to {}", output.display()))?;
        info!("openapi json exported to {}", output.display());
      }
    },
    TopCommand::Cron { command } => {
      let config = AppConfig::load()?;
      info!(
        "config loaded for cron subcommand, redis_uri={}",
        config.redis_uri
      );

      match command {
        CronCommand::HeartbeatOnce => bangumi_cron::heartbeat_once(&config).await?,
        CronCommand::TrendingSubjectsOnce => {
          bangumi_cron::trending_subjects_once(&config).await?
        }
        CronCommand::TrendingSubjectTopicsOnce => {
          bangumi_cron::trending_subject_topics_once(&config).await?
        }
        CronCommand::TruncateGlobalOnce => {
          bangumi_cron::truncate_global_once(&config).await?
        }
        CronCommand::TruncateInboxOnce => {
          bangumi_cron::truncate_inbox_once(&config).await?
        }
        CronCommand::TruncateUserOnce => {
          bangumi_cron::truncate_user_once(&config).await?
        }
        CronCommand::CleanupExpiredAccessTokensOnce => {
          bangumi_cron::cleanup_expired_access_tokens_once(&config).await?
        }
        CronCommand::CleanupExpiredRefreshTokensOnce => {
          bangumi_cron::cleanup_expired_refresh_tokens_once(&config).await?
        }
        CronCommand::RunDefaultSchedule => {
          bangumi_cron::run_default_schedule(&config).await?
        }
      }
    }
    TopCommand::Mq { command } => match command {
      MqCommand::Placeholder => {
        let config = AppConfig::load()?;
        info!(
          "config loaded for mq subcommand, redis_uri={}",
          config.redis_uri
        );
        bangumi_mq::placeholder(&config).await?;
      }
    },
  }

  Ok(())
}

fn build_runtime(command: &TopCommand) -> Result<Runtime> {
  let default_kind = default_runtime_kind(command);
  let env_kind = runtime_kind_from_env();
  let runtime_kind = env_kind.unwrap_or(default_kind);

  let mut builder = match runtime_kind {
    RuntimeKind::CurrentThread => tokio::runtime::Builder::new_current_thread(),
    RuntimeKind::MultiThread => tokio::runtime::Builder::new_multi_thread(),
  };
  builder.enable_all();

  let mut worker_threads = None;
  if matches!(runtime_kind, RuntimeKind::MultiThread) {
    worker_threads = worker_threads_from_env();
    if let Some(threads) = worker_threads {
      builder.worker_threads(threads);
    }
  }

  let runtime = builder.build().context("failed to build tokio runtime")?;

  let source = if env_kind.is_some() {
    "TOKIO_RUNTIME"
  } else {
    "command default"
  };
  info!(
    "tokio runtime selected, mode={}, source={}, worker_threads={:?}",
    runtime_kind.as_str(),
    source,
    worker_threads
  );

  Ok(runtime)
}

fn default_runtime_kind(command: &TopCommand) -> RuntimeKind {
  match command {
    TopCommand::Cron { .. } => RuntimeKind::CurrentThread,
    TopCommand::Server { .. } | TopCommand::Mq { .. } => RuntimeKind::MultiThread,
  }
}

fn runtime_kind_from_env() -> Option<RuntimeKind> {
  let value = std::env::var("TOKIO_RUNTIME").ok()?;
  match value.to_ascii_lowercase().as_str() {
    "current" | "current_thread" | "single" | "single_thread" => {
      Some(RuntimeKind::CurrentThread)
    }
    "multi" | "multi_thread" => Some(RuntimeKind::MultiThread),
    _ => None,
  }
}

fn worker_threads_from_env() -> Option<usize> {
  let value = std::env::var("TOKIO_WORKER_THREADS").ok()?;
  let parsed = value.parse::<usize>().ok()?;
  if parsed == 0 {
    return None;
  }
  Some(parsed)
}

fn init_logger_by_env() {
  if let Ok(log_format) = std::env::var("LOG_FORMAT") {
    match log_format.to_ascii_lowercase().as_str() {
      "json" => {
        let formatter = Box::new(JsonFormatter::new());
        for sink in spdlog::default_logger().sinks() {
          sink.set_formatter(formatter.clone());
        }
        info!("spdlog formatter set to json by LOG_FORMAT");
        return;
      }
      "text" => {
        info!("spdlog formatter kept as text by LOG_FORMAT");
        return;
      }
      _ => {
        info!(
          "unknown LOG_FORMAT value: {}, fallback to NODE_ENV",
          log_format
        );
      }
    }
  }

  let node_env = std::env::var("NODE_ENV").unwrap_or_default();
  if node_env == "production" {
    let formatter = Box::new(JsonFormatter::new());
    for sink in spdlog::default_logger().sinks() {
      sink.set_formatter(formatter.clone());
    }
    info!("spdlog formatter set to json for production");
  } else {
    info!("spdlog formatter set to text for non-production");
  }
}
