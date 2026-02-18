use anyhow::Result;
use bgm_config::AppConfig;
use clap::{Parser, Subcommand};
use spdlog::formatter::JsonFormatter;
use spdlog::info;

#[derive(Parser, Debug)]
#[command(name = "bgm-backend")]
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

#[tokio::main]
async fn main() -> Result<()> {
    init_logger_by_env();

    let cli = Cli::parse();
    match cli.command {
        TopCommand::Server { command } => match command {
            ServerCommand::Placeholder => {
                bgm_api::server_placeholder().await?;
            }
        },
        TopCommand::Cron { command } => {
            let config = AppConfig::load()?;
            info!(
                "config loaded for cron subcommand, redis_uri={}",
                config.redis_uri
            );

            match command {
                CronCommand::HeartbeatOnce => bgm_cron::heartbeat_once(&config).await?,
                CronCommand::TrendingSubjectsOnce => {
                    bgm_cron::trending_subjects_once(&config).await?
                }
                CronCommand::TrendingSubjectTopicsOnce => {
                    bgm_cron::trending_subject_topics_once(&config).await?
                }
                CronCommand::TruncateGlobalOnce => bgm_cron::truncate_global_once(&config).await?,
                CronCommand::TruncateInboxOnce => bgm_cron::truncate_inbox_once(&config).await?,
                CronCommand::TruncateUserOnce => bgm_cron::truncate_user_once(&config).await?,
                CronCommand::CleanupExpiredAccessTokensOnce => {
                    bgm_cron::cleanup_expired_access_tokens_once(&config).await?
                }
                CronCommand::CleanupExpiredRefreshTokensOnce => {
                    bgm_cron::cleanup_expired_refresh_tokens_once(&config).await?
                }
                CronCommand::RunDefaultSchedule => bgm_cron::run_default_schedule(&config).await?,
            }
        }
        TopCommand::Mq { command } => match command {
            MqCommand::Placeholder => {
                let config = AppConfig::load()?;
                info!(
                    "config loaded for mq subcommand, redis_uri={}",
                    config.redis_uri
                );
                bgm_mq::placeholder(&config).await?;
            }
        },
    }

    Ok(())
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
